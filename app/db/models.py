"""
SQLAlchemy 2.0 async ORM models.
All tables for the AI Risk Manager system.
"""

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ─────────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    MERCHANT = "MERCHANT"
    ANALYST  = "ANALYST"
    ADMIN    = "ADMIN"


class DecisionEnum(str, enum.Enum):
    ALLOW = "ALLOW"
    FLAG  = "FLAG"
    BLOCK = "BLOCK"


# ── Merchant ──────────────────────────────────────────────────────────────────

class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum, name="role_enum"), nullable=False, default=RoleEnum.MERCHANT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    webhook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    # relationships
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="merchant", lazy="noload"
    )


# ── Transaction ───────────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    customer_id: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)  # supports IPv6
    merchant_category_code: Mapped[str] = mapped_column(String(10), nullable=False)
    is_international: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    # relationships
    merchant: Mapped["Merchant"] = relationship(back_populates="transactions", lazy="noload")
    risk_decision: Mapped["RiskDecision | None"] = relationship(
        back_populates="transaction", lazy="noload", uselist=False
    )


# ── RiskDecision ──────────────────────────────────────────────────────────────

class RiskDecision(Base):
    __tablename__ = "risk_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    decision: Mapped[DecisionEnum] = mapped_column(
        Enum(DecisionEnum, name="decision_enum"), nullable=False
    )
    fraud_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    return_risk_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    chargeback_risk_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    feature_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    llm_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    # relationships
    transaction: Mapped["Transaction"] = relationship(
        back_populates="risk_decision", lazy="noload"
    )


# ── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True  # nullable — unauthenticated requests still logged
    )
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

# ── WebhookDeliveryLog ────────────────────────────────────────────────────────

class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )