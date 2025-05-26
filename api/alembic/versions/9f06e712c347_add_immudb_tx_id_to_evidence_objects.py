"""Add immudb_tx_id to evidence_objects

Revision ID: 9f06e712c347
Revises: 
Create Date: 2025-05-26 15:13:23.127790

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f06e712c347'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add immudb_tx_id column to evidence_objects table
    op.add_column('evidence_objects', sa.Column('immudb_tx_id', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove immudb_tx_id column
    op.drop_column('evidence_objects', 'immudb_tx_id')
