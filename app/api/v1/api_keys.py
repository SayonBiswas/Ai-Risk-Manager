"""
API key management endpoints — generate and view API keys.
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_api_key, hash_api_key
from app.db.session import get_db
from app.db.models import Merchant
from app.api.v1.auth import get_current_merchant

router = APIRouter()


# ── Pydantic Models ─────────────────────────────────────────────────────────────

class GenerateAPIKeyResponse(BaseModel):
    """Response model for API key generation."""
    api_key: str
    prefix: str = "riskmgr_"
    message: str
    generated_at: str


class APIKeyInfoResponse(BaseModel):
    """Response model for API key info (masked)."""
    has_active_key: bool
    key_preview: str
    created_at: str


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=GenerateAPIKeyResponse,
    summary="Generate a new API key",
    description=(
        "Generates a new API key for the authenticated merchant. "
        "This replaces any existing API key. The raw key is only shown once "
        "and should be stored securely. Requires JWT authentication."
    ),
)
async def generate_api_key_endpoint(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
) -> GenerateAPIKeyResponse:
    """Generate a new API key for the current merchant."""
    
    # Generate new API key
    raw_key = generate_api_key()
    new_hash = hash_api_key(raw_key)
    
    # Update merchant's API key hash
    current_merchant.api_key_hash = new_hash
    await db.commit()
    
    return GenerateAPIKeyResponse(
        api_key=raw_key,
        prefix="riskmgr_",
        message="Store this key safely — it will not be shown again.",
        generated_at=datetime.now(timezone.utc).isoformat()
    )


@router.get(
    "/",
    response_model=APIKeyInfoResponse,
    summary="Get API key information",
    description=(
        "Returns masked information about the merchant's current API key. "
        "The actual key is never returned for security. Requires JWT authentication."
    ),
)
async def get_api_key_info(
    current_merchant: Merchant = Depends(get_current_merchant),
) -> APIKeyInfoResponse:
    """Get masked API key information for the current merchant."""
    
    # Check if merchant has an API key hash (non-empty)
    has_active_key = bool(current_merchant.api_key_hash and current_merchant.api_key_hash.strip())
    
    # Create a masked preview
    if has_active_key:
        key_preview = "riskmgr_••••••••"
    else:
        key_preview = "No active key"
    
    return APIKeyInfoResponse(
        has_active_key=has_active_key,
        key_preview=key_preview,
        created_at=current_merchant.created_at.isoformat()
    )