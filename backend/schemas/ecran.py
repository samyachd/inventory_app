from schemas.base_equipment import (
    BaseEquipmentCreate,
    BaseEquipmentUpdate,
    BaseEquipmentRead,
)


class EcranCreate(BaseEquipmentCreate):
    """Créer un écran."""

    taille: float | None = None

    agent_id: int | None = None


class EcranUpdate(BaseEquipmentUpdate):
    """Mettre à jour un écran (tous champs optionnels)."""

    taille: float | None = None

    agent_id: int | None = None


class EcranRead(BaseEquipmentRead):
    """Écran retourné par l'API."""

    taille: float | None = None

    agent_id: int | None = None
