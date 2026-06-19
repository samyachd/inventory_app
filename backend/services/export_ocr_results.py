"""Export OCR results grouped by run to a timestamped JSON file.

Usage:  docker compose exec backend uv run python -m services.export_ocr_results
"""

import json
import sys
from datetime import datetime

from sqlalchemy.orm import selectinload

from db.session import SessionLocal
from db.models.ocr_stats import OcrStat


def _serialize_result(r) -> dict:
    return {
        "id": r.id,
        "type_document": r.type_document,
        "numero_document": r.numero_document,
        "numero_de_commande": r.numero_de_commande,
        "date_document": r.date_document,
        "montant_ht": r.montant_ht,
        "montant_ttc": r.montant_ttc,
        "type_equipement": r.type_equipement,
        "marque": r.marque,
        "designation": r.designation,
        "quantite": r.quantite,
        "fournisseur": r.fournisseur,
        "date_achat": r.date_achat,
        "garantie_duree": r.garantie_duree,
        "fin_garantie": r.fin_garantie,
        "tag": r.tag,
        "ram": r.ram,
        "os": r.os,
        "taille": r.taille,
        "type_licence": r.type_licence,
        "version_logiciel": r.version_logiciel,
    }


def _serialize_stat(s: OcrStat) -> dict:
    return {
        "ocr_stat_id": s.id,
        "nom_fichier": s.nom_fichier,
        "ocr_timestamp": s.timestamp.isoformat(),
        "succes": s.succes,
        "type_document": s.type_document,
        "nb_pages": s.nb_pages,
        "duree_ms": s.duree_ms,
        "taux_completude": s.taux_completude,
        "results": [_serialize_result(r) for r in s.results],
    }


def export():
    db = SessionLocal()
    try:
        stats = (
            db.query(OcrStat)
            .options(selectinload(OcrStat.results))
            .order_by(OcrStat.timestamp.desc())
            .all()
        )
        data = [_serialize_stat(s) for s in stats]
    finally:
        db.close()

    json.dump(data, sys.stdout, indent=2, ensure_ascii=False)
    print(f"\n{len(data)} runs exported", file=sys.stderr)


if __name__ == "__main__":
    export()
