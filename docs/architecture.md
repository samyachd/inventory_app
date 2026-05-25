# Architecture

## Vue d'ensemble

```
                ┌─────────────────────────────────────────────────────┐
   public       │  Apache (host)        — TLS termination, port 443  │
  HTTPS ───────►│   ↓ proxies / → 127.0.0.1:80                       │
                ├─────────────────────────────────────────────────────┤
                │  frontend (container)  — nginx, sert la SPA React  │
                │   ↓ proxies /api/* → backend:8000                   │
                ├─────────────────────────────────────────────────────┤
                │  backend (container)   — FastAPI, 4 workers uvicorn│
                │   ↓                                                 │
                │  db (container)        — PostgreSQL 15              │
                │   ↑ dumps nightly                                   │
                │  db-backup (container) — écrit sur /backups (NAS)  │
                └─────────────────────────────────────────────────────┘

  Observabilité (réseau interne) :
    prometheus → scrape backend:8000/metrics
    promtail   → scrape logs Docker → loki-proxy (basic auth) → loki
    grafana    → lit loki + prometheus
```

## Structure du projet

```
mairie/
├── backend/                   # Application FastAPI
│   ├── main.py                # Point d'entrée, enregistrement des routers
│   ├── api/routes/            # Endpoints REST
│   ├── core/                  # Configuration, sécurité, dépendances
│   ├── db/                    # Modèles SQLAlchemy, session, seed
│   ├── schemas/               # Schémas Pydantic (I/O)
│   ├── services/              # Logique métier (OCR, QR code)
│   ├── utils/                 # Utilitaires (import Excel, nettoyage)
│   ├── alembic/               # Migrations de base de données
│   └── tests/                 # Suite de tests pytest
├── frontend/                  # Application React (Vite)
│   └── src/
├── deploy/                    # Scripts et runbooks de déploiement
│   ├── apache/                # Configuration Apache vhost
│   └── restore.sh             # Script de restauration DB
├── data/                      # Données locales (gitignorées)
│   ├── excel_test/            # Fichiers Excel sources
│   ├── raw_extracts/          # Extractions brutes
│   ├── clean_extracts/        # Extractions nettoyées
│   └── seed/                  # JSON de seed de la base
├── notebooks/                 # Notebooks Jupyter (RAG/CAG)
├── docker-compose.yml         # Stack de développement
├── docker-compose.prod.yml    # Overrides de production
├── prometheus.yml             # Config Prometheus (dev)
├── promtail.yml               # Config Promtail (dev)
└── Makefile                   # Commandes de développement
```

## Couches du backend

```
HTTP Request
     ↓
FastAPI Router (api/routes/)
     ↓
Dépendances (core/dependencies.py)
  — authentification JWT
  — contrôle de rôle (admin / user / read)
     ↓
Handler de route
  — validation Pydantic automatique
  — appel SQLAlchemy ORM
  — log_action() pour audit
     ↓
PostgreSQL (via SQLAlchemy + psycopg2)
```

## Authentification et autorisation

- **JWT** (HS256) avec expiration configurable (`ACCESS_TOKEN_EXPIRE` en minutes)
- **Blacklist de tokens** : les tokens révoqués sont stockés dans `TokenBlacklist` jusqu'à expiration
- **Rôles** : `admin` > `user` > `read` — la dépendance `require_role()` accepte une liste de rôles autorisés

## Modèle de données

Voir [Modèles de base de données](database/models.md) pour le schéma complet.

Relations principales :

```
Agent ──< Ordinateur >── OfficeLicence
               │
               └──< Ecran
               └──< Document
```

## Services externes

| Service | Usage | Variable |
|---|---|---|
| **Mistral AI** | OCR sur fichiers Excel/PDF | `MISTRAL_API_KEY` |
| **NAS (SMB/NFS)** | Stockage des sauvegardes | `BACKUP_TARGET` |
| **GHCR** | Registry d'images Docker | `GHCR_TOKEN` |
