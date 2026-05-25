from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date


class BaseEquipmentCreate(BaseModel):
    """Champs communs à tous les équipements (Ordinateur, Écran)."""
    
    proprietaire: str | None = Field(None, max_length=255)
    service: str | None = Field(None, max_length=255)
    batiment: str | None = Field(None, max_length=255)
    type_equipement: str | None = Field(None, max_length=255)
    fournisseur: str | None = Field(None, max_length=255)
    tag: str = Field(..., max_length=50)
    marque: str | None = Field(None, max_length=255)
    fin_garantie: date | None = None
    date_achat: date | None = None


class BaseEquipmentUpdate(BaseModel):
    """Champs modifiables d'un équipement (tous optionnels pour PATCH)."""
    
    proprietaire: str | None = Field(None, max_length=255)
    service: str | None = Field(None, max_length=255)
    batiment: str | None = Field(None, max_length=255)
    type_equipement: str | None = Field(None, max_length=255)
    fournisseur: str | None = Field(None, max_length=255)
    tag: str | None = Field(None, max_length=50)
    marque: str | None = Field(None, max_length=255)
    fin_garantie: date | None = None
    date_achat: date | None = None  # optionnel à l'update


class BaseEquipmentRead(BaseModel):
    """Représentation d'un équipement retourné par l'API."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    proprietaire: str | None = None
    service: str | None = None
    batiment: str | None = None
    type_equipement: str | None = None
    fournisseur: str | None = None
    tag: str | None = None
    marque: str | None = None
    fin_garantie: date | None = None
    date_achat: date | None = None
    created_at: datetime
    updated_at: datetime | None = None