from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class AgentCreate(BaseModel):
    """Créer un agent."""

    nom: str = Field(..., min_length=1, max_length=255)
    email: EmailStr | None = None
    telephone: str | None = Field(None, max_length=20)
    clef_wifi: bool | None = None
    casque: bool | None = None


class AgentUpdate(BaseModel):
    """Mettre à jour un agent (tous champs optionnels)."""

    nom: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    telephone: str | None = Field(None, max_length=20)
    clef_wifi: bool | None = None
    casque: bool | None = None


class AgentRead(BaseModel):
    """Agent retourné par l'API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    email: EmailStr | None = None
    telephone: str | None = None
    clef_wifi: bool | None = None
    casque: bool | None = None

    created_at: datetime
    updated_at: datetime | None = None