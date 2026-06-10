from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, OAuth2PasswordRequestForm, HTTPBearer
from jose import jwt
from datetime import datetime, timezone
from core import settings, logger
from sqlalchemy.orm import Session
from core import verifier_mot_de_passe,creer_access_token
from core.dependencies import get_current_user
from db.models import TokenBlacklist, User
from db.session import get_db
from schemas import Token
from schemas.auth import LoginRequest

auth = APIRouter()

security= HTTPBearer()

@auth.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    
    utilisateur = db.query(User).filter(
        User.email == credentials.email,
    ).first()
    
    # Single generic message for both "no such user" and "wrong password" so the
    # response doesn't reveal which emails are registered (user enumeration).
    if not utilisateur or not verifier_mot_de_passe(
        credentials.password, utilisateur.mot_de_passe_hash
    ):
        logger.warning(f"Échec de connexion pour l'email: {credentials.email}")
        raise HTTPException(status_code=401, detail="Identifiants invalides")

    access_token = creer_access_token(data={"sub": utilisateur.email, "role":utilisateur.role})

    return {
    "access_token": access_token,
    "token_type": "bearer",
    "utilisateur_id": utilisateur.id
}

@auth.delete("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    expire_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    # Purge already-expired entries to keep the table small
    db.query(TokenBlacklist).filter(TokenBlacklist.expire_at <= datetime.now(timezone.utc)).delete()

    db.add(TokenBlacklist(token=token, expire_at=expire_at))
    db.commit()
    logger.info(f"Déconnexion : {current_user.email}")
    return {"message": "Déconnecté"}