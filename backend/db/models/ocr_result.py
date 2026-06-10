from __future__ import annotations
import datetime as dt
from sqlalchemy import String, Integer, Float, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
from db.db import Base

if TYPE_CHECKING:
    from db.models.ocr_stats import OcrStat


def _as_float(v) -> float | None:
    """Coerce an OCR value to float, tolerating strings like '1 200,50'."""
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(" ", "").replace(" ", "").replace(",", "."))
    except (TypeError, ValueError):
        return None


def _as_int(v) -> int | None:
    f = _as_float(v)
    return int(f) if f is not None else None


def _as_str(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


class OcrResult(Base):
    """One extracted item (équipement ou licence) from a single OCR run.

    Records exactly what `mistral-small-latest` returned for each line — one row
    per item — so every extraction is auditable field by field. The raw OCR
    transcript of the PDF is deliberately NOT stored here. Linked to the run it
    came from via `ocr_stat_id`; deleting the run cascades to its results.
    """
    __tablename__ = "ocr_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    ocr_stat_id: Mapped[int] = mapped_column(
        ForeignKey("ocr_stats.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Champs document ──
    type_document: Mapped[str | None] = mapped_column(String(50), nullable=True)
    numero_document: Mapped[str | None] = mapped_column(String(100), nullable=True)
    numero_de_commande: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_document: Mapped[str | None] = mapped_column(String(20), nullable=True)
    montant_ht: Mapped[float | None] = mapped_column(Float, nullable=True)
    montant_ttc: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Champs ligne (cœur) ──
    type_equipement: Mapped[str | None] = mapped_column(String(50), nullable=True)
    marque: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designation: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantite: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fournisseur: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # ── Champs opportunistes (présents seulement si écrits sur le document) ──
    tag: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ram: Mapped[str | None] = mapped_column(String(50), nullable=True)
    os: Mapped[str | None] = mapped_column(String(100), nullable=True)
    taille: Mapped[float | None] = mapped_column(Float, nullable=True)
    type_licence: Mapped[str | None] = mapped_column(String(50), nullable=True)
    version_logiciel: Mapped[str | None] = mapped_column(String(100), nullable=True)

    ocr_stat: Mapped["OcrStat"] = relationship(back_populates="results")

    @classmethod
    def from_item(cls, item: dict) -> "OcrResult":
        """Build a row from one extracted item, coercing numerics safely."""
        return cls(
            type_document=_as_str(item.get("type_document")),
            numero_document=_as_str(item.get("numero_document")),
            numero_de_commande=_as_str(item.get("numero_de_commande")),
            date_document=_as_str(item.get("date_document")),
            montant_ht=_as_float(item.get("montant_ht")),
            montant_ttc=_as_float(item.get("montant_ttc")),
            type_equipement=_as_str(item.get("type_equipement")),
            marque=_as_str(item.get("marque")),
            designation=_as_str(item.get("designation")),
            quantite=_as_int(item.get("quantite")),
            fournisseur=_as_str(item.get("fournisseur")),
            tag=_as_str(item.get("tag")),
            ram=_as_str(item.get("ram")),
            os=_as_str(item.get("os")),
            taille=_as_float(item.get("taille")),
            type_licence=_as_str(item.get("type_licence")),
            version_logiciel=_as_str(item.get("version_logiciel")),
        )
