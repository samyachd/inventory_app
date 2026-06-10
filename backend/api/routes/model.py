from time import time
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from core.dependencies import require_role
from services.ocr import extraire_document
from core.logger import logger
from db.models.ocr_stats import OcrStat
from db.models.ocr_result import OcrResult

model = APIRouter()


@model.post("/extract")
async def extract_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "user")),
):
    """OCR-only — runs Mistral on the upload, returns the extracted fields.
    Caller is responsible for what to do with them (e.g. prefill a form).
    Every attempt — success, empty, or failed — is recorded as an OcrStat row;
    successful runs also get one OcrResult row per extracted item."""
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté — PDF, JPG ou PNG uniquement",
        )

    debut_total = time()
    contenu = await file.read()

    try:
        result = await extraire_document(contenu, file.content_type)
    except Exception as e:
        logger.error(f"Erreur OCR : {e}")
        # Record the failed attempt before surfacing the error. Metrics are
        # zeroed since extraction never produced any; never let the bookkeeping
        # write mask the original failure.
        try:
            db.rollback()
            db.add(OcrStat(
                user_id=current_user.id,
                type_document="erreur",
                nom_fichier=file.filename,
                type_mime=file.content_type,
                taille_fichier=len(contenu),
                duree_ms=int((time() - debut_total) * 1000),
                succes=False,
                duree_ocr_ms=0,
                duree_extraction_ms=0,
                nb_pages=0,
                nb_champs_extraits=0,
                nb_champs_vides=0,
                taux_completude=0.0,
                resultat_json=None,
            ))
            db.commit()
        except Exception as log_err:
            db.rollback()
            logger.error(f"Échec enregistrement de la stat OCR échouée : {log_err}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'extraction OCR")

    donnees = result["donnees"]   # list of items
    metriques = result["metriques"]
    duree_ms = int((time() - debut_total) * 1000)

    type_document = metriques.pop("_type_document", "inconnu") or "inconnu"

    stat = OcrStat(
        user_id=current_user.id,
        type_document=type_document,
        nom_fichier=file.filename,
        type_mime=file.content_type,
        taille_fichier=len(contenu),
        duree_ms=duree_ms,
        succes=True,
        **metriques,
    )
    # One OcrResult row per extracted item — the field-level history of what
    # mistral-small-latest returned. Cascades from the stat row on insert.
    stat.results = [OcrResult.from_item(item) for item in donnees]
    db.add(stat)
    db.commit()

    logger.info(f"OCR réussi pour {file.filename} — {len(donnees)} équipement(s)")
    return {"donnees": donnees, "metriques": metriques}
