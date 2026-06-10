"""add ocr_results table

Records each item extracted by mistral-small-latest, one row per
équipement/licence, linked to its OCR run in ocr_stats.

Revision ID: a3b4c5d6e7f8
Revises: b3c4d5e6f7a8
Create Date: 2026-06-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ocr_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ocr_stat_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        # Champs document
        sa.Column("type_document", sa.String(length=50), nullable=True),
        sa.Column("numero_document", sa.String(length=100), nullable=True),
        sa.Column("numero_de_commande", sa.String(length=100), nullable=True),
        sa.Column("date_document", sa.String(length=20), nullable=True),
        sa.Column("montant_ht", sa.Float(), nullable=True),
        sa.Column("montant_ttc", sa.Float(), nullable=True),
        # Champs ligne (cœur)
        sa.Column("type_equipement", sa.String(length=50), nullable=True),
        sa.Column("marque", sa.String(length=100), nullable=True),
        sa.Column("designation", sa.Text(), nullable=True),
        sa.Column("quantite", sa.Integer(), nullable=True),
        sa.Column("fournisseur", sa.String(length=150), nullable=True),
        # Champs opportunistes
        sa.Column("tag", sa.String(length=100), nullable=True),
        sa.Column("ram", sa.String(length=50), nullable=True),
        sa.Column("os", sa.String(length=100), nullable=True),
        sa.Column("taille", sa.Float(), nullable=True),
        sa.Column("type_licence", sa.String(length=50), nullable=True),
        sa.Column("version_logiciel", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["ocr_stat_id"], ["ocr_stats.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ocr_results_ocr_stat_id"), "ocr_results", ["ocr_stat_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ocr_results_ocr_stat_id"), table_name="ocr_results")
    op.drop_table("ocr_results")
