"""
Redis sliding-window rate limiter — FastAPI dependency.

Algorithm: sorted-set per API key.
  - Key:   rate_limit:<identifier>
  - Score: Unix timestamp (float) of each request
  - On each request:
      1. Remove scores older than the window
      2. Count remaining members
      3. If count >= limit → 429
      4. Else add current timestamp and set expiry
"""

import time

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.config import get_settings

settings = get_settings()

RATE_EXCEEDED = HTTPException(
    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    detail="Rate limit exceeded — try again later.",
    headers={"Retry-After": str(settings.rate_limit_window_seconds)},
)


async def rate_limit(request: Request) -> None:
    """
    Sliding-window rate limiter: 100 requests per 60 seconds per API key / IP.
    Raises HTTP 429 with Retry-After header when the limit is exceeded.
    Silently skips if Redis is unavailable (fail-open for resilience).
    """
    redis: Redis = getattr(request.app.state, "redis", None)
    if redis is None:
        return  # Redis not configured — skip limiting

    # Use merchant_id from state if auth already ran, else fall back to client IP
    identifier = getattr(getattr(request, "state", None), "merchant_id", None)
    if not identifier:
        identifier = request.client.host if request.client else "unknown"

    key = f"rate_limit:{identifier}"
    now = time.time()
    window_start = now - settings.rate_limit_window_seconds

    try:
        pipe = redis.pipeline()
        # Remove timestamps outside the current window
        pipe.zremrangebyscore(key, "-inf", window_start)
        # Add current request timestamp (member = timestamp string for uniqueness)
        pipe.zadd(key, {str(now): now})
        # Count requests in window
        pipe.zcard(key)
        # Reset TTL on the key
        pipe.expire(key, settings.rate_limit_window_seconds)

        results = await pipe.execute()
        request_count = results[2]  # zcard result

        if request_count > settings.rate_limit_requests:
            raise RATE_EXCEEDED

    except HTTPException:
        raise
    except Exception:
        # Redis error — fail open (don't block legitimate traffic)
        pass