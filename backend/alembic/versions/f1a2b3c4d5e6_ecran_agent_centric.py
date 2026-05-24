"""make ecran agent-centric: backfill agent_id from PC owner, drop ordinateur_id

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
Create Date: 2026-05-23 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill agent ownership from the linked PC before dropping the link.
    op.execute(
        """
        UPDATE ecran AS e
        SET agent_id = o.agent_id
        FROM ordinateur AS o
        WHERE e.ordinateur_id = o.id
          AND e.agent_id IS NULL
          AND o.agent_id IS NOT NULL
        """
    )
    op.drop_index('ix_ecran_ordinateur_id', table_name='ecran')
    op.drop_constraint('ecran_ordinateur_id_fkey', 'ecran', type_='foreignkey')
    op.drop_column('ecran', 'ordinateur_id')


def downgrade() -> None:
    op.add_column('ecran', sa.Column('ordinateur_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'ecran_ordinateur_id_fkey', 'ecran', 'ordinateur',
        ['ordinateur_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_ecran_ordinateur_id', 'ecran', ['ordinateur_id'])
