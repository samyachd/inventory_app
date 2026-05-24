import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from core.dependencies import require_role
from core.logging_db import log_action
from schemas import (
    OfficeLicenceCreate, OfficeLicenceRead, OfficeLicenceUpdate,
    AgentRead, AgentCreate, AgentUpdate,
    OrdinateurCreate, OrdinateurRead, OrdinateurUpdate,
    EcranCreate, EcranRead, EcranUpdate,
    DocumentCreate, DocumentRead, DocumentUpdate,
    InventaireRead,
)
from db.session import get_db
from db.models import OfficeLicence, Ordinateur, Ecran, Agent, Document
from core import logger
from sqlalchemy.exc import IntegrityError


def _dump(schema_cls, obj) -> str:
    """Serialize a SQLAlchemy row to JSON using its Read schema."""
    return json.dumps(schema_cls.model_validate(obj).model_dump(mode="json"), ensure_ascii=False, default=str)

inventaire = APIRouter(dependencies=[Depends(require_role("read", "user", "admin"))])
agent = APIRouter(dependencies=[Depends(require_role("user", "admin"))])
ordinateur = APIRouter(dependencies=[Depends(require_role("user", "admin"))])
ecran = APIRouter(dependencies=[Depends(require_role("user", "admin"))])
licence = APIRouter(dependencies=[Depends(require_role("user", "admin"))])
document = APIRouter(dependencies=[Depends(require_role("user", "admin"))])


# Inventaire — single fetch for the whole inventory page

@inventaire.get("/", response_model=InventaireRead)
def read_inventaire(
    db: Session = Depends(get_db),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    return InventaireRead(
        agents=db.query(Agent).offset(offset).limit(limit).all(),
        ordinateurs=db.query(Ordinateur).offset(offset).limit(limit).all(),
        ecrans=db.query(Ecran).offset(offset).limit(limit).all(),
        licences=db.query(OfficeLicence).offset(offset).limit(limit).all(),
        documents=db.query(Document).offset(offset).limit(limit).all(),
    )


# Agent endpoints

@agent.post("/", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
def create_agent(
    agent: AgentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_agent = Agent(**agent.model_dump(exclude_unset=True))
    db.add(db_agent)
    try:
        db.flush()
        log_action(db, current_user.id, "creation", "agents", db_agent.id, agent.nom)
        db.commit()
        db.refresh(db_agent)
        logger.info(f"Agent créé avec succès - {agent.email}")
    except IntegrityError:
        db.rollback()
        logger.warning(f"IntegrityError: agent existe déjà - {agent.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un agent avec cet email existe déjà",
        )
    return db_agent


@agent.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not db_agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent introuvable")
    log_action(db, current_user.id, "suppression", "agents", agent_id, _dump(AgentRead, db_agent))
    db.delete(db_agent)
    db.commit()
    return


@agent.put("/{agent_id}", response_model=AgentRead)
def update_agent(
    agent_id: int,
    agent: AgentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not db_agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent introuvable")
    for key, value in agent.model_dump(exclude_unset=True).items():
        setattr(db_agent, key, value)
    log_action(db, current_user.id, "modification", "agents", agent_id, db_agent.nom)
    db.commit()
    db.refresh(db_agent)
    return db_agent


# Ordinateur endpoints

@ordinateur.post("/", response_model=OrdinateurRead, status_code=status.HTTP_201_CREATED)
def create_ordinateur(
    ordinateur: OrdinateurCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_ordinateur = Ordinateur(**ordinateur.model_dump(exclude_unset=True))
    db.add(db_ordinateur)
    try:
        db.flush()
        log_action(db, current_user.id, "creation", "ordinateurs", db_ordinateur.id, db_ordinateur.tag)
        db.commit()
        db.refresh(db_ordinateur)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un ordinateur avec ce tag, IP ou MAC existe déjà",
        )
    return db_ordinateur


@ordinateur.delete("/{ordinateur_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ordinateur(
    ordinateur_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_ordinateur = db.query(Ordinateur).filter(Ordinateur.id == ordinateur_id).first()
    if not db_ordinateur:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordinateur inexistant")
    log_action(db, current_user.id, "suppression", "ordinateurs", ordinateur_id, _dump(OrdinateurRead, db_ordinateur))
    db.delete(db_ordinateur)
    db.commit()
    return None


@ordinateur.put("/{ordinateur_id}", response_model=OrdinateurRead)
def update_ordinateur(
    ordinateur_id: int,
    ordinateur: OrdinateurUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_ordinateur = db.query(Ordinateur).filter(Ordinateur.id == ordinateur_id).first()
    if not db_ordinateur:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordinateur inexistant")
    for key, value in ordinateur.model_dump(exclude_unset=True).items():
        setattr(db_ordinateur, key, value)
    log_action(db, current_user.id, "modification", "ordinateurs", ordinateur_id, db_ordinateur.tag)
    db.commit()
    db.refresh(db_ordinateur)
    return db_ordinateur


# Office Licence endpoints

@licence.post("/", response_model=OfficeLicenceRead, status_code=status.HTTP_201_CREATED)
def create_license(
    license: OfficeLicenceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_licence = OfficeLicence(**license.model_dump(exclude_unset=True))
    db.add(db_licence)
    try:
        db.flush()
        log_action(db, current_user.id, "creation", "licences", db_licence.id, db_licence.clef)
        db.commit()
        db.refresh(db_licence)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une licence avec ces caractéristiques existe déjà",
        )
    return db_licence


@licence.delete("/{licence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_license(
    licence_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_licence = db.query(OfficeLicence).filter(OfficeLicence.id == licence_id).first()
    if not db_licence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licence inexistante")
    log_action(db, current_user.id, "suppression", "licences", licence_id, _dump(OfficeLicenceRead, db_licence))
    db.delete(db_licence)
    db.commit()
    return None


@licence.put("/{licence_id}", response_model=OfficeLicenceRead)
def update_license(
    licence_id: int,
    licence: OfficeLicenceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_licence = db.query(OfficeLicence).filter(OfficeLicence.id == licence_id).first()
    if not db_licence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licence inexistante")
    for key, value in licence.model_dump(exclude_unset=True).items():
        setattr(db_licence, key, value)
    log_action(db, current_user.id, "modification", "licences", licence_id, db_licence.clef)
    db.commit()
    db.refresh(db_licence)
    return db_licence


# Ecran endpoints

@ecran.post("/", response_model=EcranRead, status_code=status.HTTP_201_CREATED)
def create_ecran(
    ecran: EcranCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_ecran = Ecran(**ecran.model_dump(exclude_unset=True))
    db.add(db_ecran)
    try:
        db.flush()
        log_action(db, current_user.id, "creation", "ecrans", db_ecran.id, db_ecran.tag)
        db.commit()
        db.refresh(db_ecran)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un écran avec ce tag existe déjà",
        )
    return db_ecran


@ecran.delete("/{ecran_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ecran(
    ecran_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_ecran = db.query(Ecran).filter(Ecran.id == ecran_id).first()
    if not db_ecran:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ecran inexistant")
    log_action(db, current_user.id, "suppression", "ecrans", ecran_id, _dump(EcranRead, db_ecran))
    db.delete(db_ecran)
    db.commit()
    return None


@ecran.put("/{ecran_id}", response_model=EcranRead)
def update_ecran(
    ecran_id: int,
    ecran: EcranUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_ecran = db.query(Ecran).filter(Ecran.id == ecran_id).first()
    if not db_ecran:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ecran inexistant")
    for key, value in ecran.model_dump(exclude_unset=True).items():
        setattr(db_ecran, key, value)
    log_action(db, current_user.id, "modification", "ecrans", ecran_id, db_ecran.tag)
    db.commit()
    db.refresh(db_ecran)
    return db_ecran


# Document endpoints

def _resolve_owners(
    db: Session,
    ordinateur_ids: list[int],
    ecran_ids: list[int],
    office_licence_ids: list[int],
) -> tuple[list[Ordinateur], list[Ecran], list[OfficeLicence]]:
    """Resolve owner ID lists to ORM objects, raising 404 on any unknown id."""
    def fetch(model, ids: list[int]):
        if not ids:
            return []
        unique_ids = list(set(ids))
        rows = db.query(model).filter(model.id.in_(unique_ids)).all()
        if len(rows) != len(unique_ids):
            found = {r.id for r in rows}
            missing = [i for i in unique_ids if i not in found]
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} introuvable(s): {missing}",
            )
        return rows
    return (
        fetch(Ordinateur, ordinateur_ids),
        fetch(Ecran, ecran_ids),
        fetch(OfficeLicence, office_licence_ids),
    )


@document.post("/", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    doc: DocumentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    payload = doc.model_dump()
    ord_ids = payload.pop("ordinateur_ids", [])
    ecr_ids = payload.pop("ecran_ids", [])
    lic_ids = payload.pop("office_licence_ids", [])

    ordis, ecrs, lics = _resolve_owners(db, ord_ids, ecr_ids, lic_ids)

    db_doc = Document(**payload)
    db_doc.ordinateurs = ordis
    db_doc.ecrans = ecrs
    db_doc.office_licences = lics
    db.add(db_doc)
    try:
        db.flush()
        log_action(db, current_user.id, "creation", "documents", db_doc.id, doc.nom)
        db.commit()
        db.refresh(db_doc)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document invalide (contraintes violées)",
        )
    return db_doc


@document.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document inexistant")
    log_action(db, current_user.id, "suppression", "documents", document_id, _dump(DocumentRead, db_doc))
    db.delete(db_doc)
    db.commit()
    return None


@document.put("/{document_id}", response_model=DocumentRead)
def update_document(
    document_id: int,
    doc: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("user", "admin")),
):
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document inexistant")
    payload = doc.model_dump(exclude_unset=True)
    ord_ids = payload.pop("ordinateur_ids", None)
    ecr_ids = payload.pop("ecran_ids", None)
    lic_ids = payload.pop("office_licence_ids", None)
    for key, value in payload.items():
        setattr(db_doc, key, value)
    if ord_ids is not None or ecr_ids is not None or lic_ids is not None:
        ordis, ecrs, lics = _resolve_owners(
            db,
            ord_ids if ord_ids is not None else [],
            ecr_ids if ecr_ids is not None else [],
            lic_ids if lic_ids is not None else [],
        )
        if ord_ids is not None:
            db_doc.ordinateurs = ordis
        if ecr_ids is not None:
            db_doc.ecrans = ecrs
        if lic_ids is not None:
            db_doc.office_licences = lics
    log_action(db, current_user.id, "modification", "documents", document_id, db_doc.nom)
    db.commit()
    db.refresh(db_doc)
    return db_doc
