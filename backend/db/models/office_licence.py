from __future__ import annotations
import datetime as dt
from sqlalchemy import String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.models.base import BaseEntry
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from db.models.document import Document
    from db.models.ordinateur import Ordinateur

class OfficeLicence(BaseEntry):
    __tablename__ = "office_licence"

    type_licence: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    version: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)
    date_achat: Mapped[dt.date | None] = mapped_column(Date, nullable=True, index=True)
    fournisseur: Mapped[str | None] = mapped_column(String(255), nullable=True)
    clef: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    mail_activation: Mapped[str | None] = mapped_column(String(255), nullable=True)

    ordinateur: Mapped[list["Ordinateur"]] = relationship(back_populates="office_licence", passive_deletes=True)
    documents: Mapped[list["Document"]] = relationship(
        secondary="document_office_licence", back_populates="office_licences"
    )
