"""
Shared FastAPI dependencies used across all routers.
"""

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import get_current_merchant
from app.core.rate_limiter import rate_limit


async def get_redis(request: Request) -> Redis:
    return request.app.state.redis


# Convenience bundle — auth + rate limit together
async def authenticated(
    current: dict = Depends(get_current_merchant),
    _: None = Depends(rate_limit),
) -> dict:
    return current