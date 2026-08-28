"""
FastAPI dependency that authenticates via X-API-Key header or Bearer JWT.
Attaches merchant_id and role to request.state.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_jwt, verify_api_key
from app.db.session import get_db

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

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
    Returns {"merchant_id": ..., "role": ...} and sets request.state.
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
        from app.db.models import Merchant  # noqa: PLC0415

        result = await db.execute(select(Merchant).where(Merchant.is_active == True))  # noqa: E712
        merchants = result.scalars().all()

        for merchant in merchants:
            if verify_api_key(api_key, merchant.api_key_hash):
                request.state.merchant_id = str(merchant.id)
                request.state.role = merchant.role.value
                return {
                    "merchant_id": str(merchant.id),
                    "role": merchant.role.value,
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