"""
Pytest fixtures — async test client, DB, Redis mock, sample data factories.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import generate_api_key, hash_api_key
from app.db.base import Base
from app.db.models import (
    DecisionEnum,
    Merchant,
    RiskDecision,
    RoleEnum,
    Transaction,
)
from app.db.session import get_db
from app.main import app
from app.models.transaction import TransactionRequest

# ── Test DB — SQLite in-memory ────────────────────────────────────────────────
# Use a Neon branch URL in CI if available; fall back to SQLite for local tests.
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a test DB session, rolled back after each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
def mock_redis():
    """In-memory Redis mock — avoids needing a real Redis in tests."""
    store = {}
    redis = MagicMock()

    async def get(key):
        return store.get(key)

    async def setex(key, ttl, value):
        store[key] = value

    async def pipeline():
        pipe = MagicMock()
        results = [0, 0, 1, True]  # zremrange, zadd, zcard=1, expire
        pipe.execute = AsyncMock(return_value=results)
        pipe.zremrangebyscore = MagicMock(return_value=pipe)
        pipe.zadd = MagicMock(return_value=pipe)
        pipe.zcard = MagicMock(return_value=pipe)
        pipe.expire = MagicMock(return_value=pipe)
        return pipe

    redis.get = AsyncMock(side_effect=get)
    redis.setex = AsyncMock(side_effect=setex)
    redis.pipeline = AsyncMock(side_effect=pipeline)
    return redis


@pytest_asyncio.fixture
async def client(db, mock_redis) -> AsyncGenerator[AsyncClient, None]:
    """
    Async test client with DB and Redis overrides injected.
    ML models are mocked to return deterministic scores.
    """

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.state.redis = mock_redis

    with (
        patch("app.services.fraud_detector.fraud_detector.predict", new=AsyncMock(return_value=0.2)),
        patch("app.services.fraud_detector.return_risk.predict",    new=AsyncMock(return_value=0.15)),
        patch("app.services.fraud_detector.chargeback_risk.predict", new=AsyncMock(return_value=0.1)),
        patch("app.services.llm_reasoner._call_gemini",             new=AsyncMock(return_value="Test reason.")),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    app.dependency_overrides.clear()


# ── Factories ─────────────────────────────────────────────────────────────────

async def create_test_merchant(
    db: AsyncSession,
    role: RoleEnum = RoleEnum.MERCHANT,
) -> tuple[Merchant, str]:
    """Create a merchant and return (merchant, raw_api_key)."""
    raw_key = generate_api_key()
    merchant = Merchant(
        id=uuid.uuid4(),
        name="Test Merchant",
        api_key_hash=hash_api_key(raw_key),
        role=role,
        is_active=True,
        webhook_url="https://webhook.site/test",
        webhook_secret="test_secret_abc123",
    )
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)
    return merchant, raw_key


async def create_test_transaction(
    db: AsyncSession,
    merchant_id: uuid.UUID,
    amount: Decimal = Decimal("500.00"),
    customer_id: str = "cust_test_001",
) -> Transaction:
    """Create and persist a test transaction."""
    txn = Transaction(
        id=uuid.uuid4(),
        merchant_id=merchant_id,
        amount=amount,
        currency="INR",
        customer_id=customer_id,
        payment_method="card",
        device_id="device_test_001",
        ip_address="203.0.113.1",
        merchant_category_code="5816",
        is_international=False,
        metadata_={"transaction_id": f"ext_{uuid.uuid4().hex[:8]}"},
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


def make_transaction_payload(**overrides) -> dict:
    """Build a valid TransactionRequest payload dict."""
    base = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:8]}",
        "amount": "500.00",
        "currency": "INR",
        "customer_id": "cust_test_001",
        "payment_method": "card",
        "device_id": "device_test_001",
        "ip_address": "203.0.113.1",
        "merchant_category_code": "5816",
        "is_international": False,
        "metadata": {},
    }
    base.update(overrides)
    return base