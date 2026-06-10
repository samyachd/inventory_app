# Inventaire — Gestion du parc informatique d'une mairie

Application web de gestion d'inventaire informatique : ordinateurs, écrans,
licences Office, agents et documents d'achat. Sa fonctionnalité phare est
l'**extraction OCR automatique** des documents d'achat (devis, bons de commande,
factures) via Mistral : on dépose un PDF ou une image, et les équipements et
licences sont pré-remplis dans un tableau éditable avant création en masse.

---

## Stack technique

| Couche | Technologies |
|--------|--------------|
| **Backend** | FastAPI (Python 3.12), SQLAlchemy 2 + Alembic, PostgreSQL, authentification JWT (python-jose), hachage bcrypt (passlib), [uv](https://docs.astral.sh/uv/) |
| **OCR / IA** | Mistral (`mistral-ocr-latest` pour la transcription, `mistral-small-latest` pour l'extraction structurée) |
| **Frontend** | React 19 + TypeScript + Vite, TailwindCSS 4, Zustand, TanStack Query / Table, axios, React Router 7 |
| **Observabilité** | Prometheus, Grafana, Loki + Promtail, Tempo (traces OpenTelemetry) |
| **Orchestration** | Docker Compose (dev + prod) |

---

## Prérequis

- Docker et Docker Compose
- Git
- Une clé API Mistral (pour la fonctionnalité OCR)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url>
cd mairie
```

### 2. Configurer les variables d'environnement

La configuration est répartie sur **deux fichiers** (tous deux gitignorés) :

```bash
# Racine : identifiants Postgres + ports hôte
cp .env.example .env

# Backend : secrets applicatifs (SECRET_KEY, MISTRAL_API_KEY, CORS_ORIGINS…)
cp backend/.env.example backend/.env
```

À éditer impérativement avant le premier lancement :

- `.env` → `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `backend/.env` → `SECRET_KEY` (ex. `openssl rand -hex 32`) et `MISTRAL_API_KEY`

### 3. Lancer la stack

```bash
make dev
```

Cette commande build et démarre l'ensemble des services (Postgres, backend,
frontend, Grafana, Prometheus, Loki, Promtail, Tempo) avec hot-reload.

> **Au démarrage, le backend applique automatiquement les migrations Alembic
> (`upgrade head`) puis crée les comptes par défaut.** Aucune étape manuelle de
> migration ou de seed n'est nécessaire pour démarrer.

### 4. Accéder à l'application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/docs |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

---

## Comptes par défaut

Créés automatiquement au premier démarrage (à changer en production) :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@mairie.fr` | `Admin1234!` |
| Utilisateur | `user@mairie.fr` | `User1234!` |
| Lecteur | `reader@mairie.fr` | `Reader1234!` |

Les rôles déterminent les droits : `admin` (gestion complète, y compris les
utilisateurs), `user` (lecture + écriture sur l'inventaire et l'OCR), `reader`
(lecture seule).

---

## Commandes utiles (`make`)

`make help` affiche la liste complète. Les principales :

| Commande | Description |
|----------|-------------|
| `make dev` | Démarre la stack en dev (hot-reload, migrations + seed automatiques) |
| `make down` | Arrête tous les conteneurs |
| `make restart` | Redémarre la stack |
| `make logs` | Suit les logs de tous les services (`logs-backend`, `logs-frontend` pour cibler) |
| `make migration msg="…"` | Génère une migration Alembic (autogenerate) |
| `make migrate` | Applique les migrations en attente (sinon fait au démarrage) |
| `make seed` | (Re)remplit la base avec des données de test |
| `make db-reset` | ⚠️ Efface la base, recrée le schéma et re-seed |
| `make db-shell` | Ouvre un shell `psql` |
| `make backend-shell` | Ouvre un shell dans le conteneur backend |
| `make test` | Lance les tests `pytest` |

### Production

Les variantes prod utilisent `docker-compose.prod.yml` : `make prod`,
`make deploy`, `make migrate-prod`, `make seed-prod`, `make db-reset-prod`…
Voir [PROD.md](PROD.md) pour le déploiement détaillé.

---

## Fonctionnalité OCR

1. L'utilisateur dépose un document d'achat (PDF, JPEG ou PNG).
2. **Mistral OCR** transcrit le document en texte.
3. **Mistral** (extraction structurée) en déduit la liste des équipements et
   licences, ligne par ligne (avec quantité, désignation, montants…).
4. Le frontend affiche un tableau **éditable** pour vérification et complétion.
5. À la confirmation, chaque ligne devient un enregistrement d'inventaire lié au
   document.

Chaque analyse est tracée : métriques (durées, taux de complétude) dans
`ocr_stats`, et détail champ par champ des éléments extraits dans `ocr_results`.

---

## Structure du projet

```
backend/      API FastAPI (api/, core/, db/ models + migrations Alembic, services/, tests/)
frontend/     Application React + Vite (src/app : pages, components, services, hooks)
docs/         Documentation MkDocs (api, database, deployment, development)
deploy/       Configuration de déploiement (Apache)
grafana/      Dashboards et provisioning
data/         Extractions Excel et jeux de données de seed (dev)
```

Documentation complémentaire : [docs/](docs/) (servie via `mkdocs`) et
[PROD.md](PROD.md).

---

## Développement

- Le backend monte le code en volume avec rechargement `uvicorn --reload`.
- Le frontend tourne sur le serveur de dev Vite avec HMR.
- Gestion des dépendances : `uv` (backend), `npm` (frontend).
- Qualité : `ruff`, `mypy`, `pre-commit` (backend) ; ESLint + TypeScript (frontend).
- Tests : `make test` (pytest dans le conteneur backend).
