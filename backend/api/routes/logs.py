import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from db.session import get_db
from core.dependencies import require_role
from core.logging_db import log_action
from db.models import Log, OfficeLicence, Ordinateur, Ecran, Agent, Document
from db.models.ocr_stats import OcrStat
from schemas.logs import LogRead, OcrStatRead
from schemas import (
    OrdinateurCreate, OrdinateurRead,
    EcranCreate, EcranRead,
    AgentCreate, AgentRead,
    OfficeLicenceCreate, OfficeLicenceRead,
    DocumentCreate, DocumentRead,
)

log = APIRouter(dependencies=[Depends(require_role("admin"))])

_RESTORE_MAP = {
    "ordinateurs": (Ordinateur, OrdinateurCreate, OrdinateurRead),
    "ecrans":      (Ecran,      EcranCreate,      EcranRead),
    "agents":      (Agent,      AgentCreate,      AgentRead),
    "licences":    (OfficeLicence, OfficeLicenceCreate, OfficeLicenceRead),
    "documents":   (Document,   DocumentCreate,   DocumentRead),
}


@log.get("/", response_model=list[LogRead])
def get_logs(
    action: str | None = Query(None),
    table_cible: str | None = Query(None),
    user_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Log)
    if action:
        q = q.filter(Log.action == action)
    if table_cible:
        q = q.filter(Log.table_cible == table_cible)
    if user_id:
        q = q.filter(Log.user_id == user_id)
    return q.order_by(Log.timestamp.desc()).offset(offset).limit(limit).all()


@log.get("/ocr", response_model=list[OcrStatRead])
def get_ocr_stats(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return (
        db.query(OcrStat)
        .options(selectinload(OcrStat.results))
        .order_by(OcrStat.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@log.post("/{log_id}/restore", status_code=status.HTTP_201_CREATED)
def restore_item(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    db_log = db.query(Log).filter(Log.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Log introuvable")
    if db_log.action != "suppression":
        raise HTTPException(status_code=400, detail="Seuls les logs de suppression peuvent être restaurés")
    if not db_log.detail:
        raise HTTPException(status_code=400, detail="Ce log ne contient pas de données à restaurer")

    entry = _RESTORE_MAP.get(db_log.table_cible)
    if not entry:
        raise HTTPException(status_code=400, detail=f"Table non restoreable : {db_log.table_cible}")

    model_cls, create_schema, read_schema = entry

    try:
        raw = json.loads(db_log.detail)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Données de log invalides (non-JSON)")

    # Strip read-only fields before validating with the Create schema
    for field in ("id", "created_at", "updated_at"):
        raw.pop(field, None)

    try:
        validated = create_schema.model_validate(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Données invalides : {e}")

    obj = model_cls(**validated.model_dump())
    db.add(obj)
    try:
        db.flush()
        detail_label = getattr(obj, "tag", None) or getattr(obj, "nom", None) or getattr(obj, "clef", None) or str(obj.id)
        log_action(db, current_user.id, "creation", db_log.table_cible, obj.id, f"[restauré] {detail_label}")
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Un élément avec ces données existe déjà")

    return read_schema.model_validate(obj)
