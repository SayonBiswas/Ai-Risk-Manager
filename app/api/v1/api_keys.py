"""
API key management endpoints.

Allows merchants to create, list, update, and deactivate multiple named API keys.
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_api_key, hash_api_key
from app.db.session import get_db
from app.db.models import ApiKey, Merchant
from app.middleware.auth import get_current_merchant

router = APIRouter()


# ── Pydantic Models ─────────────────────────────────────────────────────────────

class CreateApiKeyRequest(BaseModel):
    """Request model for creating a new API key."""
    name: str = Field(..., min_length=1, max_length=100, description="Name for the API key")
    expires_in_days: Optional[int] = Field(None, ge=1, description="Optional expiration in days")


class CreateApiKeyResponse(BaseModel):
    """Response model for creating an API key."""
    id: str
    name: str
    key: str = Field(..., description="⚠️ This is the ONLY time the raw key is returned")
    key_prefix: str
    expires_at: Optional[str] = None
    created_at: str


class ApiKeyResponse(BaseModel):
    """Response model for listing API keys (never returns the raw key)."""
    id: str
    name: str
    key_prefix: str
    is_active: bool
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: str


class UpdateApiKeyRequest(BaseModel):
    """Request model for updating an API key name."""
    name: str = Field(..., min_length=1, max_length=100, description="New name for the API key")


class UpdateApiKeyResponse(BaseModel):
    """Response model for updating an API key."""
    id: str
    name: str
    key_prefix: str
    is_active: bool
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: str


class DeleteApiKeyResponse(BaseModel):
    """Response model for deactivating an API key."""
    message: str


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=CreateApiKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new API key",
    description=(
        "Creates a new API key for the authenticated merchant. "
        "Requires JWT authentication (not API key). "
        "⚠️ The raw key is returned ONLY in this response and never again."
    ),
)
async def create_api_key(
    request: CreateApiKeyRequest,
    current: dict = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
) -> CreateApiKeyResponse:
    """Create a new API key for the current merchant."""

    # Ensure we're using JWT, not API key
    if "api_key_id" in current:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create API keys using an API key. Use JWT authentication."
        )

    merchant_id = current["merchant_id"]

    # Calculate expiration if provided
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_in_days)

    # Generate the API key
    raw_key = f"riskmgr_{secrets.token_urlsafe(24)}"
    key_prefix = raw_key[:16]
    key_hash = hash_api_key(raw_key)

    # Create the API key record
    api_key = ApiKey(
        merchant_id=merchant_id,
        name=request.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        is_active=True,
        expires_at=expires_at,
    )

    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return CreateApiKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        key=raw_key,  # ⚠️ This is the ONLY time the raw key is returned
        key_prefix=api_key.key_prefix,
        expires_at=api_key.expires_at.isoformat() if api_key.expires_at else None,
        created_at=api_key.created_at.isoformat(),
    )


@router.get(
    "",
    response_model=list[ApiKeyResponse],
    summary="List all API keys",
    description=(
        "Returns all API keys for the authenticated merchant. "
        "Requires JWT authentication. Never returns the raw key or key_hash."
    ),
)
async def list_api_keys(
    current: dict = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
) -> list[ApiKeyResponse]:
    """List all API keys for the current merchant."""

    merchant_id = current["merchant_id"]

    result = await db.execute(
        select(ApiKey).where(ApiKey.merchant_id == merchant_id).order_by(ApiKey.created_at.desc())
    )
    api_keys = result.scalars().all()

    return [
        ApiKeyResponse(
            id=str(key.id),
            name=key.name,
            key_prefix=key.key_prefix,
            is_active=key.is_active,
            last_used_at=key.last_used_at.isoformat() if key.last_used_at else None,
            expires_at=key.expires_at.isoformat() if key.expires_at else None,
            created_at=key.created_at.isoformat(),
        )
        for key in api_keys
    ]


@router.delete(
    "/{key_id}",
    response_model=DeleteApiKeyResponse,
    summary="Deactivate an API key",
    description=(
        "Soft-deletes an API key by setting is_active = False. "
        "Requires JWT authentication. The key remains in the database for audit purposes."
    ),
)
async def delete_api_key(
    key_id: str,
    current: dict = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
) -> DeleteApiKeyResponse:
    """Deactivate an API key for the current merchant."""

    merchant_id = current["merchant_id"]

    # Find the API key
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.merchant_id == merchant_id,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Soft delete
    api_key.is_active = False
    await db.commit()

    return DeleteApiKeyResponse(message="API key deactivated successfully")


@router.patch(
    "/{key_id}",
    response_model=UpdateApiKeyResponse,
    summary="Update an API key",
    description=(
        "Updates the name of an API key. "
        "Requires JWT authentication."
    ),
)
async def update_api_key(
    key_id: str,
    request: UpdateApiKeyRequest,
    current: dict = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
) -> UpdateApiKeyResponse:
    """Update an API key name for the current merchant."""

    merchant_id = current["merchant_id"]

    # Find the API key
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.merchant_id == merchant_id,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Update the name
    api_key.name = request.name
    await db.commit()
    await db.refresh(api_key)

    return UpdateApiKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at.isoformat() if api_key.last_used_at else None,
        expires_at=api_key.expires_at.isoformat() if api_key.expires_at else None,
        created_at=api_key.created_at.isoformat(),
    )
