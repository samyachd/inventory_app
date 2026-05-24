from __future__ import annotations
from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.models.base import BaseEquipement
from typing import TYPE_CHECKING, Optional


if TYPE_CHECKING:
    from db.models.agent import Agent
    from db.models.document import Document


class Ecran(BaseEquipement):
    __tablename__ = "ecran"

    agent_id: Mapped[int | None] = mapped_column(ForeignKey("agent.id", ondelete="SET NULL"), nullable=True, index=True)

    taille: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)

    agent: Mapped[Optional["Agent"]] = relationship(back_populates="ecran", passive_deletes=True)
    documents: Mapped[list["Document"]] = relationship(back_populates="ecran", passive_deletes=True)
