"""
Read the latest raw inventory dump from data/raw_extracts/ and write
data/clean_extracts/normalized_<timestamp>.json shaped for the SQLAlchemy
models in db/models/ (Ordinateur, Ecran, OfficeLicence).

Two passes:
  1. STRUCTURAL — strip the Excel→JSON quirks (auto Unnamed columns,
     2 header rows, nested under "inventaire").
  2. SEMANTIC  — coerce types (bool/date/MAC/IP), null placeholders,
     widen ECRAN N columns into one ecran-per-row, dedupe office licences.

Output keys:
    - ordinateurs : list[dict]
    - ecrans      : list[dict]   (linked to ordinateurs via _ordinateur_tag)
    - office_licences : list[dict] (referenced by ordinateurs._office_key)

Usage (from backend/):
    uv run python -m utils.clean_to_models
"""
from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

def _data_dir() -> Path:
    """Resolve the data directory the same way db.seed does:
    DATA_DIR env wins, else /data if mounted, else <repo>/data on the host."""
    env = os.getenv("DATA_DIR")
    if env:
        return Path(env)
    container_default = Path("/data")
    if container_default.exists():
        return container_default
    return Path(__file__).resolve().parents[2] / "data"


DATA_DIR = _data_dir()
RAW_DIR = Path(os.getenv("RAW_EXTRACTS_DIR", str(DATA_DIR / "raw_extracts")))
OUTPUT_DIR = Path(os.getenv("CLEAN_EXTRACTS_DIR", str(DATA_DIR / "clean_extracts")))
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTPUT = OUTPUT_DIR / f"normalized_{TIMESTAMP}.json"

# Column index → human-readable name for the wide Excel sheet.
# The raw JSON has keys "Unnamed: 0".."Unnamed: 74".
RAW_COLUMNS: list[str] = [
    "SERVICE", "EMPLACEMENT", "UTILISATEUR PRINCIPAL", "NOM RESEAU",
    "N° SERIE PC", "CLEF WIFI", "LECTEUR DVD/CD EXTERNE", "WEBCAM", "CASQUE",
    "TYPE", "MAC ADRESSE ETHERNET", "MAC ADRESSE WIFI",
    "DATE FIN GARANTIE PC", "MARQUE PC", "DATE ACHAT PC", "FOURNISSEUR PC",
    "N° BC PC", "Adresse IP PC", "eligible W10", "OS", "TYPE LICENCE PC",
    "Clé OS PC", "PROCESSEUR PC", "RAM PC", "ABSOLUTE DELL",
    "DATE ACHAT OFFICE", "FOURNISSEUR OFFICE", "BC OFFICE", "VERSION OFFICE",
    "TYPE LICENCE OFFICE", "CLEF ACTIVATION", "DATE ACTIVATION",
    "Mail ACTIVATION", "CLEF OFFICE", "N° CONTRAT OPEN MICROSOFT",
    "TYPE ECRAN 1", "MARQUE ECRAN 1", "MODELE ECRAN 1", "N° SERIE ECRAN 1",
    "FOURNISSEUR ECRAN 1", "N° BC ECRAN 1", "DATE ACHAT ECRAN 1",
    "DATE FIN GARANTIE ECRAN 1",
    "TYPE ECRAN 2", "MARQUE ECRAN 2", "MODELE ECRAN 2", "N° SERIE ECRAN 2",
    "FOURNISSEUR ECRAN 2", "N° BC ECRAN 2", "DATE ACHAT ECRAN 2",
    "DATE FIN GARANTIE ECRAN 2",
    "TYPE ECRAN 3", "MARQUE ECRAN 3", "MODELE ECRAN 3", "N° SERIE ECRAN 3",
    "FOURNISSEUR ECRAN 3", "N° BC ECRAN 3", "DATE ACHAT ECRAN 3",
    "DATE FIN GARANTIE ECRAN 3",
    "TYPE ECRAN TELETRAVAIL", "MARQUE ECRAN TELETRAVAIL",
    "MODELE ECRAN TELETRAVAIL", "N° SERIE ECRAN TELETRAVAIL",
    "FOURNISSEUR ECRAN TELETRAVAIL", "N° BC ECRAN TELETRAVAIL",
    "DATE ACHAT ECRAN TELETRAVAIL", "DATE FIN GARANTIE ECRAN TELETRAVAIL",
    # pandas auto-suffixes on duplicate column names — 5th teletravail group
    "TYPE ECRAN TELETRAVAIL2", "MARQUE ECRAN TELETRAVAIL3",
    "MODELE ECRAN TELETRAVAIL4", "N° SERIE ECRAN TELETRAVAIL5",
    "FOURNISSEUR ECRAN TELETRAVAIL6", "N° BC ECRAN TELETRAVAIL7",
    "DATE ACHAT ECRAN TELETRAVAIL8", "DATE FIN GARANTIE ECRAN TELETRAVAIL2",
]


def load_raw_records() -> list[dict]:
    """Read the latest raw seed_data_*.json from raw_extracts/, drop the
    2 header rows, remap Unnamed:N keys to human-readable names."""
    files = sorted(RAW_DIR.glob("seed_data_*.json"))
    if not files:
        raise SystemExit(f"No seed_data_*.json found in {RAW_DIR}")
    src = files[-1]
    print(f"Reading {src.name}")
    payload = json.loads(src.read_text(encoding="utf-8"))
    rows = payload["inventaire"][2:]  # drop the 2 title rows

    def _rename(row: dict) -> dict:
        return {
            RAW_COLUMNS[i]: row.get(f"Unnamed: {i}")
            for i in range(len(RAW_COLUMNS))
        }

    return [_rename(r) for r in rows]

PLACEHOLDER_NULLS = {"", "?????????", "????", "N/A", "NA", "-", "—"}

PC_FIXE_KEYWORDS = ("FIXE", "OPTIPLEX", "MICRO PC", "AIO", "ECOLES", "TOUT EN UN")
PC_PORT_KEYWORDS = ("PORTABLE", "LATITUDE", "PRECISION", "SURFACE", "TABLETTE", "XPS")
ECRAN_KEYWORDS = ("ECRAN",)

# Serie values that are just a brand name (e.g. new DELL monitors entered with
# brand in the serial column). They produce 21 identical tag='DELL' rows which
# trips the unique constraint — nullify them so tag stays None.
_KNOWN_BRANDS = {
    "DELL", "HP", "LENOVO", "ASUS", "ACER", "SAMSUNG", "LG",
    "PHILIPS", "AOC", "IIYAMA", "BENQ", "VIEWSONIC", "MSI", "APPLE", "HUAWEI",
}

# ──────────────────────────────────────────────────────────────────────────
# Value coercion helpers
# ──────────────────────────────────────────────────────────────────────────

def clean_str(v) -> str | None:
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    if s in PLACEHOLDER_NULLS:
        return None
    return s or None


def to_bool(v) -> bool | None:
    """Boolean fields contain free text in source: 'OUI', 'OUI PRÊT 12/03/2024',
    'X', 'INTEGRE', 'NON', etc. Anything non-empty/non-negative reads as True."""
    s = clean_str(v)
    if s is None:
        return None
    low = s.lower()
    if low in {"non", "no", "false", "0", "n"}:
        return False
    return True


def to_date(v) -> str | None:
    """Source dates look like '2020-12-14 00:00:00'. Return ISO 'YYYY-MM-DD'."""
    s = clean_str(v)
    if s is None:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None  # silently drop unparseable dates


seen_macs = set()

# Six 1-or-2 hex segments separated by : or -. Captures each segment so
# we can left-pad the single-hex ones (e.g. "4:54:e8:..." → "04:54:e8:...").
_MAC_RE = re.compile(
    r"([0-9a-fA-F]{1,2})[:\-]([0-9a-fA-F]{1,2})[:\-]([0-9a-fA-F]{1,2})"
    r"[:\-]([0-9a-fA-F]{1,2})[:\-]([0-9a-fA-F]{1,2})[:\-]([0-9a-fA-F]{1,2})"
)


def to_mac(v) -> str | None:
    if not v:
        return None
    # Find the first plausible MAC anywhere in the string. Handles trailing
    # junk like "C8:4B:D6:74:C3:24\n WIFI " and missing leading zeros.
    m = _MAC_RE.search(str(v))
    if not m:
        return None
    formatted = ":".join(g.lower().zfill(2) for g in m.groups())
    if formatted in seen_macs:
        return None
    seen_macs.add(formatted)
    return formatted

GENERIC_NAMES = {"linux", "localhost", "ubuntu", "desktop", "workgroup",
                 "alprdf1", "pmdp13", "public_europe2", "com3", "accueil2"}

# "ECRAN KIASMA", "ECRAN CSU", etc. — descriptive labels, not hostnames.
GENERIC_PREFIXES = ("ecran ", "imprimante ", "pc ")


def _is_generic_hostname(name: str) -> bool:
    s = name.strip().lower()
    if s in GENERIC_NAMES:
        return True
    return any(s.startswith(p) for p in GENERIC_PREFIXES)


def to_hostname(name, mac, tag):
    if name and not _is_generic_hostname(name):
        return name
    elif mac:
        short_mac = mac.replace(":", "")[-6:]
        return f"linux-{short_mac}"
    elif tag:
        return f"pc-{tag}"
    return name


def to_ip(v) -> str | None:
    s = clean_str(v)
    if s is None:
        return None
    if not re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", s):
        return None
    return s

# OS canonical names — ordered most-specific first.
_OS_MAP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"win.*?11.*?educ", re.I), "Windows 11 Education"),
    (re.compile(r"win.*?11", re.I), "Windows 11 Pro"),
    (re.compile(r"(win|w).*?10.*?educ", re.I), "Windows 10 Pro Education"),
    (re.compile(r"(win|w).*?10", re.I), "Windows 10 Pro"),
    (re.compile(r"^10\s*pro", re.I), "Windows 10 Pro"),
    (re.compile(r"^7\s*pro", re.I), "Windows 7 Pro"),
    (re.compile(r"linux.*?mint", re.I), "Linux Mint"),
    (re.compile(r"\blinux\b", re.I), "Linux"),
]


def normalize_os(v) -> str | None:
    s = clean_str(v)
    if s is None:
        return None
    for pattern, canonical in _OS_MAP:
        if pattern.search(s):
            return canonical
    return s


_RAM_RE = re.compile(r"(\d+)\s*(?:go|gb|g)\b", re.I)


def normalize_ram(v) -> str | None:
    s = clean_str(v)
    if s is None:
        return None
    m = _RAM_RE.search(s)
    if m:
        return f"{m.group(1)} Go"
    return s


def to_size(value):
    if not value:
        return None
    
    # 1. On remplace la virgule par un point au cas où
    value = str(value).replace(',', '.')
    
    # 2. Regex : on garde les chiffres ET le point décimal
    # On cherche le premier nombre (entier ou décimal) dans la chaîne
    match = re.search(r"(\d+(?:\.\d+)?)", value)
    
    if match:
        return float(match.group(1))
    
    return None


# ──────────────────────────────────────────────────────────────────────────
# Bucketing
# ──────────────────────────────────────────────────────────────────────────

def bucket_type(raw: str | None) -> str | None:
    """Map the 25 raw TYPE values to a small set used by the UI."""
    s = clean_str(raw)
    if s is None:
        return None
    upper = s.upper()
    if any(k in upper for k in ECRAN_KEYWORDS) and "PORTABLE" not in upper:
        return "ECRAN"
    if any(k in upper for k in PC_PORT_KEYWORDS):
        return "PC PORTABLE"
    if any(k in upper for k in PC_FIXE_KEYWORDS):
        return "PC FIXE"
    return s  # keep original if unknown


# ──────────────────────────────────────────────────────────────────────────
# Row → model dicts
# ──────────────────────────────────────────────────────────────────────────

ECRAN_SLOTS = [
    # (slot, type_key, marque_key, modele_key, serie_key, fournisseur_key, achat_key, garantie_key)
    (1, "TYPE ECRAN 1", "MARQUE ECRAN 1", "MODELE ECRAN 1", "N° SERIE ECRAN 1",
     "FOURNISSEUR ECRAN 1", "DATE ACHAT ECRAN 1", "DATE FIN GARANTIE ECRAN 1"),
    (2, "TYPE ECRAN 2", "MARQUE ECRAN 2", "MODELE ECRAN 2", "N° SERIE ECRAN 2",
     "FOURNISSEUR ECRAN 2", "DATE ACHAT ECRAN 2", "DATE FIN GARANTIE ECRAN 2"),
    (3, "TYPE ECRAN 3", "MARQUE ECRAN 3", "MODELE ECRAN 3", "N° SERIE ECRAN 3",
     "FOURNISSEUR ECRAN 3", "DATE ACHAT ECRAN 3", "DATE FIN GARANTIE ECRAN 3"),
    (4, "TYPE ECRAN TELETRAVAIL", "MARQUE ECRAN TELETRAVAIL", "MODELE ECRAN TELETRAVAIL",
     "N° SERIE ECRAN TELETRAVAIL", "FOURNISSEUR ECRAN TELETRAVAIL",
     "DATE ACHAT ECRAN TELETRAVAIL", "DATE FIN GARANTIE ECRAN TELETRAVAIL"),
    # Excel collision: pandas auto-suffixed the 5th teletravail group
    (5, "TYPE ECRAN TELETRAVAIL2", "MARQUE ECRAN TELETRAVAIL3", "MODELE ECRAN TELETRAVAIL4",
     "N° SERIE ECRAN TELETRAVAIL5", "FOURNISSEUR ECRAN TELETRAVAIL6",
     "DATE ACHAT ECRAN TELETRAVAIL8", "DATE FIN GARANTIE ECRAN TELETRAVAIL2"),
]


def build_ordinateur(row: dict) -> dict | None:
    tag = clean_str(row.get("N° SERIE PC"))
    date_achat = to_date(row.get("DATE ACHAT PC"))
    type_eq = bucket_type(row.get("TYPE"))
    marque = clean_str(row.get("MARQUE PC"))

    # Infer equipment type from brand when TYPE column is blank (42 such rows).
    if type_eq is None and marque:
        upper = marque.upper()
        if any(k in upper for k in PC_PORT_KEYWORDS):
            type_eq = "PC PORTABLE"
        else:
            type_eq = "PC FIXE"

    # Skip rows that aren't a PC: no serial AND not labelled as a PC type.
    if tag is None and type_eq not in {"PC FIXE", "PC PORTABLE"}:
        return None

    # Compute MACs once — to_mac() registers each in seen_macs, so calling
    # it twice for the same field would return None the second time.
    mac_eth = to_mac(row.get("MAC ADRESSE ETHERNET"))
    mac_wifi = to_mac(row.get("MAC ADRESSE WIFI"))

    return {
        "tag": tag,
        "type_equipement": type_eq,
        "service": clean_str(row.get("SERVICE")),
        "batiment": clean_str(row.get("EMPLACEMENT")),
        "proprietaire": None,
        "_agent_key": clean_str(row.get("UTILISATEUR PRINCIPAL")),
        # _clef_wifi and _casque are agent-level accessories; stored here
        # temporarily so main() can fold them into the agent dict.
        "_clef_wifi": to_bool(row.get("CLEF WIFI")),
        "_casque": to_bool(row.get("CASQUE")),
        "marque": marque,
        "fournisseur": clean_str(row.get("FOURNISSEUR PC")),
        "date_achat": date_achat,
        "fin_garantie": to_date(row.get("DATE FIN GARANTIE PC")),
        "ram": normalize_ram(row.get("RAM PC")),
        "os": normalize_os(row.get("OS")),
        "nom_reseau": to_hostname(row.get("NOM RESEAU"), mac_eth, tag),
        "ip_address": to_ip(row.get("Adresse IP PC")),
        "mac_ethernet": mac_eth,
        "mac_wifi": mac_wifi,
        "lecteur_cd": to_bool(row.get("LECTEUR DVD/CD EXTERNE")),
        "absolute_dell": to_bool(row.get("ABSOLUTE DELL")),
    }


def build_ecrans(row: dict, ordi_tag: str | None) -> list[dict]:    
    ecrans = []
    service = clean_str(row.get("SERVICE"))
    batiment = clean_str(row.get("EMPLACEMENT"))
    for slot, k_type, k_marque, k_modele, k_serie, k_four, k_achat, k_garantie in ECRAN_SLOTS:
        type_e = clean_str(row.get(k_type))
        marque = clean_str(row.get(k_marque))
        modele = clean_str(row.get(k_modele))
        serie = clean_str(row.get(k_serie))
        date_achat = to_date(row.get(k_achat))
        # Nullify serie when it's just a brand name ("DELL" entered 21 times
        # for new DELL monitors) or when serie == marque exactly.
        if serie and serie.strip().upper() in _KNOWN_BRANDS:
            serie = None
        elif serie and marque and serie.lower() == marque.lower():
            serie = None
        # Slot is empty if nothing identifies it
        if not any([type_e, marque, modele, serie, date_achat]):
            continue
        ecrans.append({
            "tag": serie,
            "_slot": slot,
            "taille": to_size(type_e),           # values like 'LCD 22"' fit BaseEquipement.taille semantics
            "marque": " ".join(filter(None, [marque, modele])) or None,
            "type_equipement": "ECRAN",
            "service": service,
            "batiment": batiment,
            "fournisseur": clean_str(row.get(k_four)),
            "date_achat": date_achat,
            "fin_garantie": to_date(row.get(k_garantie)),
            "_ordinateur_tag": ordi_tag,         # link key, resolved at seed time
        })
    return ecrans


def build_office_licence(row: dict) -> dict | None:
    """Returns None if the row carries no Office info at all."""
    version = clean_str(row.get("VERSION OFFICE"))
    date_achat = to_date(row.get("DATE ACHAT OFFICE"))
    type_lic = clean_str(row.get("TYPE LICENCE OFFICE"))
    fournisseur = clean_str(row.get("FOURNISSEUR OFFICE"))
    if not any([version, date_achat, type_lic, fournisseur]):
        return None
    return {
        "type_licence": type_lic,
        "version": version,
        "date_achat": date_achat,
        "fournisseur": fournisseur,
    }


def office_dedupe_key(lic: dict) -> tuple:
    return (lic["version"], lic["date_achat"], lic.get("type_licence"), lic.get("fournisseur"))


# ──────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────

def main() -> None:
    rows = load_raw_records()

    ordinateurs: list[dict] = []
    ecrans: list[dict] = []
    licences: dict[tuple, dict] = {}
    agents: dict[str, dict] = {}   # _agent_key → agent dict (deduped)
    seen_pc_tags: set[str] = set()
    skipped = Counter()

    for row in rows:
        ordi = build_ordinateur(row)

        if ordi is not None:
            # Drop duplicate PCs by tag (some serials repeat across rows)
            if ordi["tag"] and ordi["tag"] in seen_pc_tags:
                skipped["duplicate_pc_tag"] += 1
                ordi = None
            else:
                if ordi["tag"]:
                    seen_pc_tags.add(ordi["tag"])

                lic = build_office_licence(row)
                if lic is not None:
                    key = office_dedupe_key(lic)
                    if key not in licences:
                        licences[key] = lic
                    ordi["_office_key"] = list(key)
                else:
                    ordi["_office_key"] = None

                ordinateurs.append(ordi)
        elif clean_str(row.get("TYPE")) and "ECRAN" not in str(row.get("TYPE")).upper():
            skipped["row_not_a_pc"] += 1

        ordi_tag = ordi["tag"] if ordi else None
        ecrans.extend(build_ecrans(row, ordi_tag))

    for ordi in ordinateurs:
        key = ordi.get("_agent_key")
        clef = ordi.pop("_clef_wifi", None)
        casque = ordi.pop("_casque", None)
        if key:
            if key not in agents:
                agents[key] = {"_agent_key": key, "nom": key, "clef_wifi": None, "casque": None}
            # First non-None value across all of the agent's PCs wins.
            if agents[key]["clef_wifi"] is None and clef is not None:
                agents[key]["clef_wifi"] = clef
            if agents[key]["casque"] is None and casque is not None:
                agents[key]["casque"] = casque

    output = {
        "ordinateurs": ordinateurs,
        "ecrans": ecrans,
        "office_licences": list(licences.values()),
        "agents": list(agents.values()),
    }

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {OUTPUT.name}")
    print(f"  agents         : {len(agents)}")
    print(f"  ordinateurs    : {len(ordinateurs)}")
    print(f"    with agent   : {sum(1 for o in ordinateurs if o.get('_agent_key'))}")
    print(f"    with office  : {sum(1 for o in ordinateurs if o.get('_office_key'))}")
    print(f"    with tag     : {sum(1 for o in ordinateurs if o.get('tag'))}")
    print(f"  ecrans         : {len(ecrans)}")
    print(f"    linked to PC : {sum(1 for e in ecrans if e.get('_ordinateur_tag'))}")
    print(f"  office_licences: {len(licences)}")
    if skipped:
        print(f"  skipped        : {dict(skipped)}")


if __name__ == "__main__":
    main()
