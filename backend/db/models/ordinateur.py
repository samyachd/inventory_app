from __future__ import annotations
from sqlalchemy import String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.models.base import BaseEquipement
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from db.models.agent import Agent
    from db.models.document import Document
    from db.models.office_licence import OfficeLicence

class Ordinateur(BaseEquipement):
    __tablename__ = "ordinateur"

    office_licence_id: Mapped[int | None] = mapped_column(ForeignKey("office_licence.id", ondelete="SET NULL"), nullable=True)
    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agent.id", ondelete="SET NULL"), nullable=True)

    ram: Mapped[str | None] = mapped_column(String(50), nullable=True)
    os: Mapped[str | None] = mapped_column(String(100), nullable=True)
    nom_reseau: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    tag_chargeur: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    mac_ethernet: Mapped[str | None] = mapped_column(String(17), nullable=True, unique=True)
    mac_wifi: Mapped[str | None] = mapped_column(String(17), nullable=True, unique=True)
    lecteur_cd: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    absolute_dell: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    watt: Mapped[int | None] = mapped_column(Integer, nullable=True)

    office_licence: Mapped[Optional["OfficeLicence"]] = relationship(back_populates="ordinateur", passive_deletes=True)
    agent: Mapped[Optional["Agent"]] = relationship(back_populates="ordinateur", passive_deletes=True)
    documents: Mapped[list["Document"]] = relationship(back_populates="ordinateur", passive_deletes=True)
