"""Initial schema — merchants, transactions, risk_decisions, audit_logs

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    role_enum = postgresql.ENUM("MERCHANT", "ANALYST", "ADMIN", name="role_enum")
    decision_enum = postgresql.ENUM("ALLOW", "FLAG", "BLOCK", name="decision_enum")
    role_enum.create(op.get_bind(), checkfirst=True)
    decision_enum.create(op.get_bind(), checkfirst=True)

    # ── merchants ─────────────────────────────────────────────────────────────
    op.create_table(
        "merchants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("api_key_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("MERCHANT", "ANALYST", "ADMIN", name="role_enum"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("webhook_url", sa.String(500), nullable=True),
        sa.Column("webhook_secret", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # ── transactions ──────────────────────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("customer_id", sa.String(255), nullable=False),
        sa.Column("payment_method", sa.String(50), nullable=False),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("merchant_category_code", sa.String(10), nullable=False),
        sa.Column("is_international", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["merchant_id"], ["merchants.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_transactions_merchant_id", "transactions", ["merchant_id"])
    op.create_index("ix_transactions_customer_id", "transactions", ["customer_id"])
    op.create_index("ix_transactions_created_at", "transactions", ["created_at"])

    # ── risk_decisions ────────────────────────────────────────────────────────
    op.create_table(
        "risk_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("decision", sa.Enum("ALLOW", "FLAG", "BLOCK", name="decision_enum"), nullable=False),
        sa.Column("fraud_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("return_risk_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("chargeback_risk_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("feature_snapshot", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("llm_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_risk_decisions_transaction_id", "risk_decisions", ["transaction_id"])
    op.create_index("ix_risk_decisions_decision", "risk_decisions", ["decision"])

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("endpoint", sa.String(255), nullable=False),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_audit_logs_merchant_id", "audit_logs", ["merchant_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("risk_decisions")
    op.drop_table("transactions")
    op.drop_table("merchants")
    op.execute("DROP TYPE IF EXISTS decision_enum")
    op.execute("DROP TYPE IF EXISTS role_enum")