from __future__ import annotations
import datetime as dt
from enum import Enum as PyEnum
from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.db import Base
from db.models.base import BaseEntry
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from db.models.ordinateur import Ordinateur
    from db.models.ecran import Ecran
    from db.models.office_licence import OfficeLicence


class DocumentType(str, PyEnum):
    devis = "devis"
    bon_de_commande = "bon_de_commande"
    facture = "facture"


# ── Many-to-many join tables ──────────────────────────────────────────────
# Declared at module scope so both Document and the owner models can reference
# them via `secondary=...`.

document_ordinateur = Table(
    "document_ordinateur",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("document.id", ondelete="CASCADE"), primary_key=True),
    Column("ordinateur_id", Integer, ForeignKey("ordinateur.id", ondelete="CASCADE"), primary_key=True),
)

document_ecran = Table(
    "document_ecran",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("document.id", ondelete="CASCADE"), primary_key=True),
    Column("ecran_id", Integer, ForeignKey("ecran.id", ondelete="CASCADE"), primary_key=True),
)

document_office_licence = Table(
    "document_office_licence",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("document.id", ondelete="CASCADE"), primary_key=True),
    Column("office_licence_id", Integer, ForeignKey("office_licence.id", ondelete="CASCADE"), primary_key=True),
)


class Document(BaseEntry):
    __tablename__ = "document"

    type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type_enum"),
        nullable=False,
        index=True,
    )

    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    numero: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    date_document: Mapped[dt.date] = mapped_column(Date, nullable=False)

    montant_ttc: Mapped[float | None] = mapped_column(Float, nullable=True)
    montant_ht: Mapped[float | None] = mapped_column(Float, nullable=True)

    ordinateurs: Mapped[list["Ordinateur"]] = relationship(
        secondary=document_ordinateur, back_populates="documents"
    )
    ecrans: Mapped[list["Ecran"]] = relationship(
        secondary=document_ecran, back_populates="documents"
    )
    office_licences: Mapped[list["OfficeLicence"]] = relationship(
        secondary=document_office_licence, back_populates="documents"
    )

    __table_args__ = (
        CheckConstraint(
            "type = 'facture' OR (montant_ttc IS NULL AND montant_ht IS NULL)",
            name="ck_document_montant_only_facture",
        ),
    )
