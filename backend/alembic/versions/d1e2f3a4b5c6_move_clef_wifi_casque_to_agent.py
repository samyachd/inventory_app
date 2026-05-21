"""move clef_wifi and casque from ordinateur to agent

Revision ID: d1e2f3a4b5c6
Revises: b0aa449cb9cc
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'd1245b5eb0fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agent', sa.Column('clef_wifi', sa.Boolean(), nullable=True))
    op.add_column('agent', sa.Column('casque', sa.Boolean(), nullable=True))
    op.drop_column('ordinateur', 'clef_wifi')
    op.drop_column('ordinateur', 'casque')


def downgrade() -> None:
    op.add_column('ordinateur', sa.Column('casque', sa.Boolean(), nullable=True))
    op.add_column('ordinateur', sa.Column('clef_wifi', sa.Boolean(), nullable=True))
    op.drop_column('agent', 'casque')
    op.drop_column('agent', 'clef_wifi')
