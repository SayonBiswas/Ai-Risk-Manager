"""
Seed a test merchant into the DB for local development.
Run: python scripts/seed_db.py
Prints the raw API key — save it for testing.
"""

import asyncio
import sys
import os
import hashlib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal
from app.db.models import Merchant, RoleEnum
import uuid
import secrets


def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"riskmgr_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    """Simple hash for API key (SHA-256)."""
    return hashlib.sha256(api_key.encode()).hexdigest()


async def seed() -> None:
    raw_key = generate_api_key()
    merchant = Merchant(
        id=uuid.uuid4(),
        name="Test Merchant",
        email="seed@example.com",
        password_hash="seed_placeholder_not_for_login",
        api_key_hash=hash_api_key(raw_key),
        role=RoleEnum.MERCHANT,
        is_active=True,
        webhook_url="https://webhook.site/your-test-id",
        webhook_secret=generate_api_key(),
    )

    async with AsyncSessionLocal() as session:
        session.add(merchant)
        await session.commit()

    print("─" * 50)
    print(f"Merchant created:  {merchant.name}")
    print(f"Merchant ID:       {merchant.id}")
    print(f"Raw API Key:       {raw_key}")
    print("Save this key — it won't be shown again.")
    print("─" * 50)


if __name__ == "__main__":
    asyncio.run(seed())