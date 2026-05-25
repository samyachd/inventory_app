"""make document↔equipment links many-to-many

Adds 3 join tables (document_ordinateur, document_ecran, document_office_licence),
backfills from the existing scalar FK columns on `document`, then drops those columns.

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-05-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'document_ordinateur',
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('ordinateur_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['document.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ordinateur_id'], ['ordinateur.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('document_id', 'ordinateur_id'),
    )
    op.create_index(
        'ix_document_ordinateur_ordinateur_id',
        'document_ordinateur', ['ordinateur_id'],
    )

    op.create_table(
        'document_ecran',
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('ecran_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['document.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ecran_id'], ['ecran.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('document_id', 'ecran_id'),
    )
    op.create_index('ix_document_ecran_ecran_id', 'document_ecran', ['ecran_id'])

    op.create_table(
        'document_office_licence',
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('office_licence_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['document.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['office_licence_id'], ['office_licence.id'], ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('document_id', 'office_licence_id'),
    )
    op.create_index(
        'ix_document_office_licence_office_licence_id',
        'document_office_licence', ['office_licence_id'],
    )

    op.execute(
        """
        INSERT INTO document_ordinateur (document_id, ordinateur_id)
        SELECT id, ordinateur_id FROM document WHERE ordinateur_id IS NOT NULL
        """
    )
    op.execute(
        """
        INSERT INTO document_ecran (document_id, ecran_id)
        SELECT id, ecran_id FROM document WHERE ecran_id IS NOT NULL
        """
    )
    op.execute(
        """
        INSERT INTO document_office_licence (document_id, office_licence_id)
        SELECT id, office_licence_id FROM document WHERE office_licence_id IS NOT NULL
        """
    )

    op.drop_index('ix_document_ordinateur_id', table_name='document')
    op.drop_constraint('document_ordinateur_id_fkey', 'document', type_='foreignkey')
    op.drop_column('document', 'ordinateur_id')

    op.drop_index('ix_document_ecran_id', table_name='document')
    op.drop_constraint('document_ecran_id_fkey', 'document', type_='foreignkey')
    op.drop_column('document', 'ecran_id')

    op.drop_index('ix_document_office_licence_id', table_name='document')
    op.drop_constraint(
        'document_office_licence_id_fkey', 'document', type_='foreignkey',
    )
    op.drop_column('document', 'office_licence_id')


def downgrade() -> None:
    op.add_column(
        'document', sa.Column('office_licence_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'document_office_licence_id_fkey', 'document', 'office_licence',
        ['office_licence_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index(
        'ix_document_office_licence_id', 'document', ['office_licence_id'],
    )

    op.add_column('document', sa.Column('ecran_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'document_ecran_id_fkey', 'document', 'ecran',
        ['ecran_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_document_ecran_id', 'document', ['ecran_id'])

    op.add_column('document', sa.Column('ordinateur_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'document_ordinateur_id_fkey', 'document', 'ordinateur',
        ['ordinateur_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_document_ordinateur_id', 'document', ['ordinateur_id'])

    # Restore first owner per document, then drop join tables. With many-to-many
    # data, this loses any extra owners — that's the inherent risk of downgrade.
    op.execute(
        """
        UPDATE document d
        SET ordinateur_id = j.ordinateur_id
        FROM (SELECT DISTINCT ON (document_id) document_id, ordinateur_id
              FROM document_ordinateur ORDER BY document_id, ordinateur_id) j
        WHERE d.id = j.document_id
        """
    )
    op.execute(
        """
        UPDATE document d
        SET ecran_id = j.ecran_id
        FROM (SELECT DISTINCT ON (document_id) document_id, ecran_id
              FROM document_ecran ORDER BY document_id, ecran_id) j
        WHERE d.id = j.document_id
        """
    )
    op.execute(
        """
        UPDATE document d
        SET office_licence_id = j.office_licence_id
        FROM (SELECT DISTINCT ON (document_id) document_id, office_licence_id
              FROM document_office_licence ORDER BY document_id, office_licence_id) j
        WHERE d.id = j.document_id
        """
    )

    op.drop_index(
        'ix_document_office_licence_office_licence_id',
        table_name='document_office_licence',
    )
    op.drop_table('document_office_licence')
    op.drop_index('ix_document_ecran_ecran_id', table_name='document_ecran')
    op.drop_table('document_ecran')
    op.drop_index(
        'ix_document_ordinateur_ordinateur_id', table_name='document_ordinateur',
    )
    op.drop_table('document_ordinateur')
