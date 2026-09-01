"""
API key and JWT utilities.
"""

import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


def hash_api_key(raw_key: str) -> str:
    """Simple hash for API key (SHA-256)."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


def verify_api_key(raw_key: str, hashed: str) -> bool:
    """Verify API key against hash."""
    return hash_api_key(raw_key) == hashed


def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"riskmgr_{secrets.token_urlsafe(32)}"


def create_jwt(data: dict, expires_minutes: int | None = None) -> str:
    expires = expires_minutes or settings.jwt_expire_minutes
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=expires)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None