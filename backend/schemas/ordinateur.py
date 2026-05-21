from datetime import date
from pydantic import Field
from schemas.base_equipment import (
    BaseEquipmentCreate,
    BaseEquipmentUpdate,
    BaseEquipmentRead,
)


class OrdinateurCreate(BaseEquipmentCreate):
    """Créer un ordinateur. Hérite des champs communs + spécifiques."""
    
    # Champs spécifiques optionnels
    ram: str | None = Field(None, max_length=50)
    os: str | None = Field(None, max_length=100)
    nom_reseau: str | None = Field(None, max_length=50)
    tag_chargeur: str | None = Field(None, max_length=50)
    ip_address: str | None = Field(None, max_length=45)
    mac_ethernet: str | None = Field(None, max_length=17)
    mac_wifi: str | None = Field(None, max_length=17)
    lecteur_cd: bool | None = None
    absolute_dell: bool | None = None
    watt: int | None = Field(None, ge=0)

    # FK
    agent_id: int | None = None
    officelicence_id: int | None = None


class OrdinateurUpdate(BaseEquipmentUpdate):
    """Mettre à jour un ordinateur (tous champs optionnels)."""

    ram: str | None = Field(None, max_length=50)
    os: str | None = Field(None, max_length=100)
    nom_reseau: str | None = Field(None, max_length=50)
    tag_chargeur: str | None = Field(None, max_length=50)
    ip_address: str | None = Field(None, max_length=45)
    mac_ethernet: str | None = Field(None, max_length=17)
    mac_wifi: str | None = Field(None, max_length=17)
    lecteur_cd: bool | None = None
    absolute_dell: bool | None = None
    watt: int | None = Field(None, ge=0)

    agent_id: int | None = None
    officelicence_id: int | None = None


class OrdinateurRead(BaseEquipmentRead):
    """Ordinateur retourné par l'API."""

    ram: str | None = None
    os: str | None = None
    nom_reseau: str | None = None
    tag_chargeur: str | None = None
    ip_address: str | None = None
    mac_ethernet: str | None = None
    mac_wifi: str | None = None
    lecteur_cd: bool | None = None
    absolute_dell: bool | None = None
    watt: int | None = None

    agent_id: int | None = None
    officelicence_id: int | None = None