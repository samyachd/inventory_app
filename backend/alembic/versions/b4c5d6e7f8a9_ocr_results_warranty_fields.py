"""add warranty fields to ocr_results

date_achat + garantie_duree are extracted verbatim; fin_garantie is derived in
the OCR service (base date + duration), never by the LLM.

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-06-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ocr_results", sa.Column("date_achat", sa.String(length=20), nullable=True))
    op.add_column("ocr_results", sa.Column("garantie_duree", sa.String(length=50), nullable=True))
    op.add_column("ocr_results", sa.Column("fin_garantie", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("ocr_results", "fin_garantie")
    op.drop_column("ocr_results", "garantie_duree")
    op.drop_column("ocr_results", "date_achat")
