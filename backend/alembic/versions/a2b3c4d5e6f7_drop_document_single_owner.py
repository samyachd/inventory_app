"""drop ck_document_single_owner so a document can link to multiple equipments

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_document_single_owner', 'document', type_='check')


def downgrade() -> None:
    op.create_check_constraint(
        'ck_document_single_owner',
        'document',
        "(CASE WHEN ordinateur_id IS NOT NULL THEN 1 ELSE 0 END "
        "+ CASE WHEN ecran_id IS NOT NULL THEN 1 ELSE 0 END "
        "+ CASE WHEN office_licence_id IS NOT NULL THEN 1 ELSE 0 END) <= 1",
    )
