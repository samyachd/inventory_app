"""drop ecran.slot column and related constraints

Revision ID: e1f2a3b4c5d6
Revises: d1e2f3a4b5c6
Create Date: 2026-05-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('uq_ecran_slot_per_pc', 'ecran', type_='unique')
    op.drop_constraint('ck_slot_1_5', 'ecran', type_='check')
    op.drop_constraint('ck_slot_required_when_linked', 'ecran', type_='check')
    op.drop_column('ecran', 'slot')


def downgrade() -> None:
    op.add_column('ecran', sa.Column('slot', sa.Integer(), nullable=True))
    op.create_unique_constraint('uq_ecran_slot_per_pc', 'ecran', ['ordinateur_id', 'slot'])
    op.create_check_constraint('ck_slot_1_5', 'ecran', 'slot IS NULL OR (slot BETWEEN 1 AND 5)')
    op.create_check_constraint(
        'ck_slot_required_when_linked', 'ecran', 'ordinateur_id IS NULL OR slot IS NOT NULL'
    )
