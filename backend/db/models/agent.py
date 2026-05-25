from __future__ import annotations
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.models.base import BaseEntry

if TYPE_CHECKING:
    from db.models.ecran import Ecran
    from db.models.ordinateur import Ordinateur


class Agent(BaseEntry):
    __tablename__ = "agent"

    nom: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    clef_wifi: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    casque: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    ordinateur: Mapped[list["Ordinateur"]] = relationship(back_populates="agent", passive_deletes=True)
    ecran: Mapped[list["Ecran"]] = relationship(back_populates="agent", passive_deletes=True)