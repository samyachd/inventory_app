import re
import time
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from db.session import get_db
from db.db import engine
from core.dependencies import require_role

schema_router = APIRouter(dependencies=[Depends(require_role("admin"))])

# Tables that must never appear in schema management
SYSTEM_TABLES = {
    "alembic_version", "token_blacklist", "user", "logs", "ocr_stats",
}

PROTECTED_COLUMNS = {"id", "created_at", "updated_at"}

ALLOWED_TYPES: dict[str, str] = {
    "text":      "TEXT",
    "integer":   "INTEGER",
    "boolean":   "BOOLEAN",
    "date":      "DATE",
    "numeric":   "NUMERIC",
    "timestamp": "TIMESTAMPTZ",
}

_IDENT = re.compile(r'^[a-z][a-z0-9_]*$')
_SAFE_DEFAULT = re.compile(r"^(NULL|TRUE|FALSE|NOW\(\)|CURRENT_TIMESTAMP|CURRENT_DATE|\d+(\.\d+)?)$", re.IGNORECASE)

_tables_cache: list[str] | None = None
_tables_cache_at: float = 0.0
_TABLES_TTL = 30.0


def _manageable_tables() -> list[str]:
    global _tables_cache, _tables_cache_at
    now = time.monotonic()
    if _tables_cache is not None and now - _tables_cache_at < _TABLES_TTL:
        return _tables_cache
    result = sorted(
        t for t in inspect(engine).get_table_names(schema="public")
        if t not in SYSTEM_TABLES
    )
    _tables_cache = result
    _tables_cache_at = now
    return result


def _invalidate_tables_cache():
    global _tables_cache
    _tables_cache = None


def _assert_table(table: str):
    if table not in _manageable_tables():
        raise HTTPException(status_code=404, detail=f"Table inconnue : {table}")


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool
    default: str | None
    protected: bool


class AddColumnRequest(BaseModel):
    name: str
    type: str
    nullable: bool = True
    default: str | None = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ALLOWED_TYPES:
            raise ValueError(f"Type non supporté. Valeurs acceptées : {list(ALLOWED_TYPES)}")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not _IDENT.match(v):
            raise ValueError("Nom invalide")
        return v

    @field_validator("default")
    @classmethod
    def validate_default(cls, v: str | None) -> str | None:
        if v is not None and not _SAFE_DEFAULT.match(v):
            raise ValueError("Valeur par défaut non autorisée. Valeurs acceptées : NULL, TRUE, FALSE, NOW(), CURRENT_TIMESTAMP, CURRENT_DATE, ou un nombre")
        return v


class RenameColumnRequest(BaseModel):
    new_name: str

    @field_validator("new_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not _IDENT.match(v):
            raise ValueError("Nom invalide")
        return v


class CreateTableRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not _IDENT.match(v):
            raise ValueError("Le nom doit commencer par une lettre minuscule et ne contenir que des lettres, chiffres et underscores")
        return v


# ─── Routes ──────────────────────────────────────────────────────────────────

# NOTE: /tables must be defined before /{table} so FastAPI doesn't capture "tables" as a path param.

@schema_router.get("/tables", response_model=list[str])
def list_tables():
    return _manageable_tables()


@schema_router.post("/tables", status_code=status.HTTP_201_CREATED)
def create_table(req: CreateTableRequest, db: Session = Depends(get_db)):
    all_known = set(_manageable_tables()) | SYSTEM_TABLES
    if req.name in all_known:
        raise HTTPException(status_code=400, detail=f"La table « {req.name} » existe déjà")
    try:
        db.execute(text(f"""
            CREATE TABLE "{req.name}" (
                id          SERIAL PRIMARY KEY,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        db.commit()
        _invalidate_tables_cache()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Échec de la création : {exc}")
    return {"table": req.name}


@schema_router.get("/{table}", response_model=list[ColumnInfo])
def get_columns(table: str):
    _assert_table(table)
    inspector = inspect(engine)
    raw_cols = inspector.get_columns(table)
    return [
        ColumnInfo(
            name=col["name"],
            type=str(col["type"]),
            nullable=bool(col.get("nullable", True)),
            default=str(col["default"]) if col.get("default") is not None else None,
            protected=col["name"] in PROTECTED_COLUMNS,
        )
        for col in raw_cols
    ]


@schema_router.post("/{table}/columns", status_code=status.HTTP_201_CREATED)
def add_column(table: str, req: AddColumnRequest, db: Session = Depends(get_db)):
    _assert_table(table)
    pg_type = ALLOWED_TYPES[req.type]
    null_clause = "" if req.nullable else " NOT NULL"
    default_clause = f" DEFAULT {req.default}" if req.default else (" DEFAULT NULL" if req.nullable else "")
    try:
        db.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{req.name}" {pg_type}{null_clause}{default_clause}'))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Échec de l'ajout : {exc}")
    return {"column": req.name}


@schema_router.patch("/{table}/columns/{column}")
def rename_column(table: str, column: str, req: RenameColumnRequest, db: Session = Depends(get_db)):
    _assert_table(table)
    if column in PROTECTED_COLUMNS:
        raise HTTPException(status_code=400, detail=f"La colonne '{column}' est protégée")
    try:
        db.execute(text(f'ALTER TABLE "{table}" RENAME COLUMN "{column}" TO "{req.new_name}"'))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Échec du renommage : {exc}")
    return {"column": req.new_name}


@schema_router.delete("/{table}/columns/{column}", status_code=status.HTTP_204_NO_CONTENT)
def drop_column(table: str, column: str, db: Session = Depends(get_db)):
    _assert_table(table)
    if column in PROTECTED_COLUMNS:
        raise HTTPException(status_code=400, detail=f"La colonne '{column}' est protégée")
    try:
        db.execute(text(f'ALTER TABLE "{table}" DROP COLUMN "{column}"'))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Échec de la suppression : {exc}")
    return None
