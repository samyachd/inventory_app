from __future__ import annotations
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.db import Base

if TYPE_CHECKING:
    from db.models.ocr_result import OcrResult

class OcrStat(Base):
    __tablename__ = "ocr_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    # Callable default: evaluated at INSERT, not at import. Naive UTC to match
    # the assumption in prune_ocr_stats (compares against a tz-stripped UTC now).
    timestamp: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    # Performance
    duree_ms: Mapped[int]          # temps de traitement total
    duree_ocr_ms: Mapped[int]      # temps OCR Mistral seul
    duree_extraction_ms: Mapped[int] # temps extraction JSON

    # Qualité
    succes: Mapped[bool]           # OCR réussi ou non
    nb_champs_extraits: Mapped[int] # nombre de champs trouvés
    nb_champs_vides: Mapped[int]    # champs non trouvés
    taux_completude: Mapped[float]  # % champs remplis

    # Contexte
    nom_fichier : Mapped[str]      # nom du fichier traité
    type_document: Mapped[str]     # "facture", "devis", "bon_commande"
    type_mime: Mapped[str]         # "application/pdf", "image/jpeg"
    taille_fichier: Mapped[int]    # en bytes
    nb_pages: Mapped[int]          # nombre de pages traitées

    #Historique
    resultat_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Détail des champs extraits — une ligne OcrResult par équipement/licence
    results: Mapped[list["OcrResult"]] = relationship(
        back_populates="ocr_stat",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )