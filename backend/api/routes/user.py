from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.dependencies import require_role
from core.logging_db import log_action
from core.security import hacher_mot_de_passe, valider_force_mot_de_passe
from db.models.user import User
from db.session import get_db
from schemas import UserCreate, UserRead, UserUpdate
from core.logger import logger

user = APIRouter()


@user.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    est_valide, erreurs = valider_force_mot_de_passe(user_data.password)
    if not est_valide:
        raise HTTPException(status_code=400, detail={"erreurs": erreurs})

    db_user = User(
        nom=user_data.nom,
        email=user_data.email,
        mot_de_passe_hash=hacher_mot_de_passe(user_data.password),
        role=user_data.role,
    )
    db.add(db_user)
    db.flush()
    log_action(db, current_user.id, "creation", "utilisateurs", db_user.id, db_user.email)
    db.commit()
    db.refresh(db_user)
    logger.info(f"Utilisateur créé : {db_user.id}")
    return db_user


@user.get("/", response_model=list[UserRead])
def read_users(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return db.query(User).all()

@user.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    data = user_data.model_dump(exclude_unset=True)
    if "password" in data:
        est_valide, erreurs = valider_force_mot_de_passe(data["password"])
        if not est_valide:
            raise HTTPException(status_code=400, detail={"erreurs": erreurs})
        db_user.mot_de_passe_hash = hacher_mot_de_passe(data.pop("password"))

    for key, value in data.items():
        setattr(db_user, key, value)

    changed = ", ".join(data.keys()) or "password"
    log_action(db, current_user.id, "modification", "utilisateurs", user_id, changed)
    db.commit()
    db.refresh(db_user)
    logger.info(f"Utilisateur mis à jour : {user_id}")
    return db_user


@user.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    log_action(db, current_user.id, "suppression", "utilisateurs", user_id, db_user.email)
    db.delete(db_user)
    db.commit()
    logger.info(f"Utilisateur supprimé : {user_id}")
    return None
