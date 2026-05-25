from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


class OfficeLicenceCreate(BaseModel):
    """Créer une nouvelle licence Office."""

    version: str | None = Field(None, min_length=1, max_length=500)
    type_licence: str | None = Field(None, max_length=255)
    fournisseur: str | None = Field(None, max_length=255)
    date_achat: date | None = None
    clef: str = Field(..., max_length=255)
    mail_activation: str | None = Field(None, max_length=255)


class OfficeLicenceUpdate(BaseModel):
    """Mettre à jour une licence Office (tous les champs optionnels)."""

    version: str | None = Field(None, min_length=1, max_length=500)
    type_licence: str | None = Field(None, max_length=255)
    fournisseur: str | None = Field(None, max_length=255)
    date_achat: date | None = None
    clef: str | None = Field(None, max_length=255)
    mail_activation: str | None = Field(None, max_length=255)


class OfficeLicenceRead(BaseModel):
    """Licence Office complète retournée par l'API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    version: str | None = None
    type_licence: str | None = None
    fournisseur: str | None = None
    date_achat: date | None = None
    clef: str | None = None
    mail_activation: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
