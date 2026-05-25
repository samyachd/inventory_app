import datetime as dt
from enum import Enum as PyEnum
from sqlalchemy import Date, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey
from db.db import Base


class TypeEquipementEnum(str, PyEnum):
    pc_fixe = "PC FIXE"
    pc_portable = "PC PORTABLE"
    ecran = "ECRAN"
    autre = "AUTRE"

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    expire_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class BaseEntry(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(primary_key=True)
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())

class BaseEquipement(BaseEntry):
    __abstract__ = True

    proprietaire: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    service: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    batiment: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    type_equipement: Mapped[TypeEquipementEnum | None] = mapped_column(
        Enum(
            TypeEquipementEnum,
            name="type_equipement_enum",
            # Send the .value ("PC FIXE") to PG, not the .name ("pc_fixe").
            # The PG enum was created with the values, so .name doesn't match.
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=True,
        index=True,
    )
    tag: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    marque: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    fin_garantie: Mapped[dt.date | None] = mapped_column(Date, nullable=True, index=True)
    date_achat: Mapped[dt.date | None] = mapped_column(Date, nullable=True, index=True)
    fournisseur: Mapped[str | None] = mapped_column(String(255), nullable=True)
