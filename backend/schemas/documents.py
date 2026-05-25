from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from db.models.document import DocumentType


class DocumentCreate(BaseModel):
    type: DocumentType
    nom: str = Field(..., min_length=1, max_length=255)
    numero: str = Field(..., min_length=1, max_length=50)
    path: str = Field(..., min_length=1, max_length=255)
    date_document: date
    montant_ttc: float | None = Field(None, ge=0)
    montant_ht: float | None = Field(None, ge=0)
    ordinateur_ids: list[int] = Field(default_factory=list)
    ecran_ids: list[int] = Field(default_factory=list)
    office_licence_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def _montants_only_facture(self):
        if self.type != DocumentType.facture and (
            self.montant_ttc is not None or self.montant_ht is not None
        ):
            raise ValueError("montant_ttc/montant_ht ne s'appliquent qu'aux factures.")
        return self


class DocumentUpdate(BaseModel):
    nom: str | None = Field(None, min_length=1, max_length=255)
    numero: str | None = Field(None, min_length=1, max_length=50)
    path: str | None = Field(None, min_length=1, max_length=255)
    date_document: date | None = None
    montant_ttc: float | None = Field(None, ge=0)
    montant_ht: float | None = Field(None, ge=0)
    # None = leave unchanged. [] = clear all links of that type.
    ordinateur_ids: list[int] | None = None
    ecran_ids: list[int] | None = None
    office_licence_ids: list[int] | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: DocumentType
    nom: str
    numero: str
    path: str
    date_document: date
    montant_ttc: float | None = None
    montant_ht: float | None = None
    ordinateur_ids: list[int] = Field(default_factory=list)
    ecran_ids: list[int] = Field(default_factory=list)
    office_licence_ids: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def _flatten_relations(cls, data):
        """Accept an ORM Document instance and project its M2M relationships
        into the flat ID lists the API exposes."""
        # If we're loading from a dict (e.g. unit tests), trust the input.
        if isinstance(data, dict):
            return data
        # ORM mode: pull IDs off the relationship lists.
        out = {
            "id": data.id,
            "type": data.type,
            "nom": data.nom,
            "numero": data.numero,
            "path": data.path,
            "date_document": data.date_document,
            "montant_ttc": data.montant_ttc,
            "montant_ht": data.montant_ht,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "ordinateur_ids": [o.id for o in (data.ordinateurs or [])],
            "ecran_ids": [e.id for e in (data.ecrans or [])],
            "office_licence_ids": [l.id for l in (data.office_licences or [])],
        }
        return out
