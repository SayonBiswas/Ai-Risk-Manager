"""Add security question and answer to merchants

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add security_question and security_answer columns to merchants table
    op.add_column("merchants", sa.Column("security_question", sa.String(255), nullable=True))
    op.add_column("merchants", sa.Column("security_answer", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("merchants", "security_answer")
    op.drop_column("merchants", "security_question")
