"""Add user authentication fields to merchants table

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Columns already exist in the database from previous migration
    # This migration is stamped to maintain revision history
    pass


def downgrade() -> None:
    # Columns were already present; this migration is for bookkeeping only
    pass
