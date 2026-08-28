"""Add webhook_delivery_logs table

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "webhook_delivery_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event", sa.String(100), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_webhook_delivery_logs_merchant_id",
        "webhook_delivery_logs",
        ["merchant_id"],
    )
    op.create_index(
        "ix_webhook_delivery_logs_event",
        "webhook_delivery_logs",
        ["event"],
    )
    op.create_index(
        "ix_webhook_delivery_logs_created_at",
        "webhook_delivery_logs",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_table("webhook_delivery_logs")