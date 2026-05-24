"""Seed the inventory DB from data/clean_extracts/normalized_*.json
(produced by utils.clean_to_models).

Idempotent: re-running skips rows already present (matched by tag for
equipment, by (version, date_achat, type_licence, fournisseur) for licences).

Usage (from backend/):
    docker compose exec backend uv run python -m db.seed
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.session import SessionLocal
from db.models import Agent, Ecran, Ordinateur, OfficeLicence
from db.models.user import User, RoleEnum
from core.security import hacher_mot_de_passe


# Resolution rules:
#   1. CLEAN_EXTRACTS_DIR env var wins (set this in containers).
#   2. Else /data/clean_extracts if it exists (the in-container mount path).
#   3. Else <repo>/data/clean_extracts (host-side dev, when seed.py lives at
#      <repo>/backend/db/seed.py — i.e. parents[2] is the repo root).
def _resolve_clean_dir() -> Path:
    env = os.getenv("CLEAN_EXTRACTS_DIR")
    if env:
        return Path(env)
    container_default = Path("/data/clean_extracts")
    if container_default.exists():
        return container_default
    return Path(__file__).resolve().parents[2] / "data" / "clean_extracts"


CLEAN_DIR = _resolve_clean_dir()

ADMIN_EMAIL = "admin@mairie.fr"
ADMIN_PASSWORD = "Admin1234!"

USER_EMAIL = "user@mairie.fr"
USER_PASSWORD = "User1234!"

READER_EMAIL = "reader@mairie.fr"
READER_PASSWORD = "Reader1234!"


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _parse_date(s: str | None) -> dt.date | None:
    return dt.date.fromisoformat(s) if s else None


def _fallback_tag(prefix: str, raw: dict) -> str:
    """Deterministic tag for equipment missing one in source data.
    Stable across re-runs so idempotency checks still work."""
    stable = {k: v for k, v in raw.items() if not k.startswith("_") and v is not None}
    digest = hashlib.sha1(json.dumps(stable, sort_keys=True).encode()).hexdigest()[:10]
    return f"{prefix}-AUTO-{digest}"


def _make_clef(key: tuple) -> str:
    """Deterministic licence key when none is present in source data."""
    seed_str = "|".join(str(k) for k in key if k is not None)
    return "LIC-AUTO-" + hashlib.sha1(seed_str.encode()).hexdigest()[:12]


def _latest_normalized_file() -> Path:
    files = sorted(CLEAN_DIR.glob("normalized_*.json"))
    if not files:
        raise SystemExit(
            f"No normalized_*.json found in {CLEAN_DIR}. "
            "Run `uv run python -m utils.clean_to_models` first."
        )
    return files[-1]


# ──────────────────────────────────────────────────────────────────────
# Seed steps
# ──────────────────────────────────────────────────────────────────────

def seed_admin(db) -> None:
    if db.query(User).filter(User.email == ADMIN_EMAIL).first():
        print(f"  → admin already exists ({ADMIN_EMAIL})")
        return
    db.add(
        User(
            nom="Admin",
            email=ADMIN_EMAIL,
            mot_de_passe_hash=hacher_mot_de_passe(ADMIN_PASSWORD),
            role=RoleEnum.admin,
    ))
    db.add(
        User(
            nom="User",
            email=USER_EMAIL,
            mot_de_passe_hash=hacher_mot_de_passe(USER_PASSWORD),
            role=RoleEnum.user,
        ))
    db.add(    
        User(
            nom="Reader",
            email=READER_EMAIL,
            mot_de_passe_hash=hacher_mot_de_passe(READER_PASSWORD),
            role=RoleEnum.read,
        ))
    db.commit()
    print(f"  ✓ admin created ({ADMIN_EMAIL} / {ADMIN_PASSWORD})")


def seed_office_licences(db, items: list[dict]) -> dict[tuple, OfficeLicence]:
    """Insert licences and return a map { (version, date_achat, type_licence,
    fournisseur) → OfficeLicence } so ordinateurs can resolve their _office_key."""
    by_key: dict[tuple, OfficeLicence] = {}
    created = 0
    for raw in items:
        key = (
            raw.get("version"),
            raw.get("date_achat"),
            raw.get("type_licence"),
            raw.get("fournisseur"),
        )
        existing = (
            db.query(OfficeLicence)
            .filter(
                OfficeLicence.version == key[0],
                OfficeLicence.date_achat == _parse_date(key[1]),
                OfficeLicence.type_licence == key[2],
                OfficeLicence.fournisseur == key[3],
            )
            .first()
        )
        if existing:
            by_key[key] = existing
            continue
        lic = OfficeLicence(
            version=raw.get("version"),
            type_licence=raw.get("type_licence"),
            date_achat=_parse_date(raw.get("date_achat")),
            fournisseur=raw.get("fournisseur"),
            clef=raw.get("clef") or _make_clef(key),
        )
        db.add(lic)
        db.flush()
        by_key[key] = lic
        created += 1
    print(f"  ✓ office_licences : {created}/{len(items)} created")
    return by_key


def seed_agents(db, items: list[dict]) -> dict[str, Agent]:
    """Insert agents and return { _agent_key → Agent }."""
    by_key: dict[str, Agent] = {}
    created = 0
    skipped = 0

    for raw in items:
        key = raw.get("_agent_key")
        nom = raw.get("nom")
        if not key or not nom:
            continue
        existing = db.query(Agent).filter(Agent.nom == nom).first()
        if existing:
            by_key[key] = existing
            skipped += 1
            continue
        agent = Agent(
            nom=nom,
            clef_wifi=raw.get("clef_wifi"),
            casque=raw.get("casque"),
        )
        db.add(agent)
        db.flush()
        by_key[key] = agent
        created += 1

    print(f"  ✓ agents         : {created}/{len(items)} created (skipped {skipped} existing)")
    return by_key


def seed_ordinateurs(
    db,
    items: list[dict],
    licences_by_key: dict[tuple, OfficeLicence],
    agents_by_key: dict[str, Agent],
) -> dict[str, Ordinateur]:
    """Insert ordinateurs. Returns { tag → Ordinateur } so écrans can link."""
    by_tag: dict[str, Ordinateur] = {}
    created = 0
    skipped_dup = 0
    seen_in_json = set()

    for raw in items:
        tag = raw.get("tag") or _fallback_tag("PC", raw)

        if tag in seen_in_json:
            skipped_dup += 1
            continue

        existing = db.query(Ordinateur).filter(Ordinateur.tag == tag).first()
        if existing:
            by_tag[tag] = existing
            skipped_dup += 1
            seen_in_json.add(tag)
            # Back-fill agent_id for ordinateurs seeded before agent support.
            if existing.agent_id is None:
                agent_key = raw.get("_agent_key")
                if agent_key and agent_key in agents_by_key:
                    existing.agent_id = agents_by_key[agent_key].id
            continue

        seen_in_json.add(tag)

        office_key = raw.get("_office_key")
        office_id = (
            licences_by_key[tuple(office_key)].id
            if office_key and tuple(office_key) in licences_by_key
            else None
        )
        agent_key = raw.get("_agent_key")
        agent_id = (
            agents_by_key[agent_key].id
            if agent_key and agent_key in agents_by_key
            else None
        )

        ordi = Ordinateur(
            tag=tag,
            type_equipement=raw.get("type_equipement"),
            service=raw.get("service"),
            batiment=raw.get("batiment"),
            proprietaire=raw.get("proprietaire"),
            marque=raw.get("marque"),
            fournisseur=raw.get("fournisseur"),
            date_achat=_parse_date(raw.get("date_achat")),
            fin_garantie=_parse_date(raw.get("fin_garantie")),
            ram=raw.get("ram"),
            os=raw.get("os"),
            nom_reseau=raw.get("nom_reseau"),
            ip_address=raw.get("ip_address"),
            mac_ethernet=raw.get("mac_ethernet"),
            mac_wifi=raw.get("mac_wifi"),
            lecteur_cd=raw.get("lecteur_cd"),
            absolute_dell=raw.get("absolute_dell"),
            office_licence_id=office_id,
            agent_id=agent_id,
        )
        db.add(ordi)
        db.flush()
        by_tag[tag] = ordi
        created += 1
    print(
        f"  ✓ ordinateurs    : {created}/{len(items)} created"
        f" (skipped {skipped_dup} duplicates by tag)"
    )
    return by_tag


def seed_ecrans(
    db, items: list[dict], ordis_by_tag: dict[str, Ordinateur]
) -> None:
    created = 0
    skipped_dup = 0
    seen_tags: set[str] = set()
    for raw in items:
        # The Excel rows are PC-centric, so we use the PC tag only as a hop
        # to find the agent. The ecran itself is linked to the agent, not the PC.
        owner_tag = raw.get("_ordinateur_tag")
        ordi = ordis_by_tag.get(owner_tag) if owner_tag else None
        agent_id = ordi.agent_id if ordi else None
        # _slot is an ETL-only hint (source-row position) used to build a
        # deterministic tag when several screens on the same PC have no serial.
        slot_hint = raw.get("_slot") if owner_tag else None

        tag = raw.get("tag")
        if not tag:
            if owner_tag and slot_hint is not None:
                tag = f"ECR-{owner_tag}-S{slot_hint}"
            else:
                tag = _fallback_tag("ECR", raw)

        if tag in seen_tags:
            skipped_dup += 1
            continue
        existing = db.query(Ecran).filter(Ecran.tag == tag).first()
        if existing:
            skipped_dup += 1
            seen_tags.add(tag)
            continue
        seen_tags.add(tag)

        ecran = Ecran(
            tag=tag,
            taille=raw.get("taille"),
            marque=raw.get("marque"),
            type_equipement=raw.get("type_equipement"),
            service=raw.get("service"),
            batiment=raw.get("batiment"),
            fournisseur=raw.get("fournisseur"),
            date_achat=_parse_date(raw.get("date_achat")),
            fin_garantie=_parse_date(raw.get("fin_garantie")),
            agent_id=agent_id,
        )
        db.add(ecran)
        created += 1
    db.flush()
    print(
        f"  ✓ ecrans         : {created}/{len(items)} created"
        f" (skipped {skipped_dup} duplicates by tag)"
    )


# ──────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────

def seed() -> None:
    src = _latest_normalized_file()
    print(f"Reading {src}")
    data = json.loads(src.read_text(encoding="utf-8"))

    db = SessionLocal()
    try:
        print("\n👤 Admin")
        seed_admin(db)

        print("\n👥 Agents")
        agents_by_key = seed_agents(db, data.get("agents", []))

        print("\n📀 Office licences")
        licences_by_key = seed_office_licences(db, data.get("office_licences", []))

        print("\n💻 Ordinateurs")
        ordis_by_tag = seed_ordinateurs(
            db, data.get("ordinateurs", []), licences_by_key, agents_by_key
        )

        print("\n🖥️  Écrans")
        seed_ecrans(db, data.get("ecrans", []), ordis_by_tag)

        db.commit()
        print("\n✅ Seed terminé")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
