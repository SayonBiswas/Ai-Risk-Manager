"""
API key and JWT utilities.
"""

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_api_key(raw_key: str) -> str:
    return pwd_context.hash(raw_key)


def verify_api_key(raw_key: str, hashed: str) -> bool:
    return pwd_context.verify(raw_key, hashed)


def generate_api_key() -> str:
    """Generate a UUID-based raw API key."""
    return f"rm_{uuid.uuid4().hex}"


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