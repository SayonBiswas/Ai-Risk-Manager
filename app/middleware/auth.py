"""
FastAPI dependency that authenticates via X-API-Key header or Bearer JWT.
Attaches merchant_id, role, and api_key_id to request.state.
"""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_jwt, hash_api_key
from app.db.session import get_db

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or missing credentials",
)


async def get_current_merchant(
    request: Request,
    api_key: str | None = Depends(api_key_header),
    bearer: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Accepts X-API-Key header OR Authorization: Bearer <jwt>.
    Returns {"merchant_id": ..., "role": ..., "api_key_id": ...} and sets request.state.
    """
    # ── JWT path ──────────────────────────────────────────────────────────────
    if bearer:
        payload = decode_jwt(bearer.credentials)
        if not payload:
            raise UNAUTHORIZED
        request.state.merchant_id = payload.get("merchant_id")
        request.state.role = payload.get("role", "MERCHANT")
        return {"merchant_id": request.state.merchant_id, "role": request.state.role}

    # ── API key path ──────────────────────────────────────────────────────────
    if api_key:
        # Import here to avoid circular import before models exist
        from app.db.models import ApiKey, Merchant  # noqa: PLC0415

        # Hash the incoming API key
        key_hash = hash_api_key(api_key)

        # Query api_keys table
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active == True  # noqa: E712
            )
        )
        api_key_obj = result.scalar_one_or_none()

        if not api_key_obj:
            raise UNAUTHORIZED

        # Check if key has expired
        if api_key_obj.expires_at and datetime.now(timezone.utc) > api_key_obj.expires_at:
            raise UNAUTHORIZED

        # Get merchant to verify they're active
        merchant_result = await db.execute(
            select(Merchant).where(Merchant.id == api_key_obj.merchant_id)
        )
        merchant = merchant_result.scalar_one_or_none()

        if not merchant or not merchant.is_active:
            raise UNAUTHORIZED

        # Update last_used_at via Redis debounce (at most once per minute)
        redis = request.app.state.redis
        if redis:
            redis_key = f"key_last_used:{api_key_obj.id}"
            # Check if we need to update DB
            needs_update = await redis.setnx(redis_key, "1")
            if needs_update:
                # Set TTL to 60 seconds
                await redis.expire(redis_key, 60)
                # Update DB
                api_key_obj.last_used_at = datetime.now(timezone.utc)
                await db.commit()

        # Attach to request state
        request.state.merchant_id = str(merchant.id)
        request.state.role = merchant.role.value
        request.state.api_key_id = str(api_key_obj.id)

        return {
            "merchant_id": str(merchant.id),
            "role": merchant.role.value,
            "api_key_id": str(api_key_obj.id),
        }

    raise UNAUTHORIZED


async def require_role(*roles: str):
    """
    Factory dependency — checks that the authenticated merchant has one of the given roles.

    Usage:
        Depends(require_role("ADMIN", "ANALYST"))
    """
    async def _check(current: dict = Depends(get_current_merchant)):
        if current["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current
    return _check