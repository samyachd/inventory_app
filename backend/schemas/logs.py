from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    timestamp: datetime
    action: str
    table_cible: str
    item_id: int | None
    detail: str | None


class OcrResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ocr_stat_id: int
    created_at: datetime

    type_document: str | None
    numero_document: str | None
    numero_de_commande: str | None
    date_document: str | None
    montant_ht: float | None
    montant_ttc: float | None

    type_equipement: str | None
    marque: str | None
    designation: str | None
    quantite: int | None
    fournisseur: str | None

    date_achat: str | None
    garantie_duree: str | None
    fin_garantie: str | None

    tag: str | None
    ram: str | None
    os: str | None
    taille: float | None
    type_licence: str | None
    version_logiciel: str | None


class OcrStatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    timestamp: datetime
    nom_fichier: str
    type_document: str
    type_mime: str
    taille_fichier: int
    nb_pages: int
    nb_champs_extraits: int
    nb_champs_vides: int
    taux_completude: float
    duree_ms: int
    duree_ocr_ms: int
    duree_extraction_ms: int
    succes: bool
    resultat_json: str | None
    results: list[OcrResultRead] = []
