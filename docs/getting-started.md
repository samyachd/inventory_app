# Démarrage rapide

## Prérequis

- Docker 24+ et `docker compose` v2
- Git
- `uv` (gestionnaire de paquets Python) pour le développement local

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/samyachd/mairie.git
cd mairie
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Éditer `.env` avec les valeurs suivantes :

| Variable | Description | Exemple |
|---|---|---|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `mairie` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | (fort, aléatoire) |
| `POSTGRES_DB` | Nom de la base | `mairie_db` |
| `VITE_API_URL` | URL de l'API pour le frontend | `http://localhost:8000` |

Éditer `backend/.env` :

| Variable | Description |
|---|---|
| `SECRET_KEY` | Clé JWT (32+ caractères hex) |
| `MISTRAL_API_KEY` | Clé API Mistral (pour l'OCR) |
| `CORS_ORIGINS` | Origines autorisées (ex: `http://localhost:5173`) |

### 3. Démarrer la stack

```bash
make dev
```

Cela lance :

- PostgreSQL sur le port `5432`
- Backend FastAPI sur `http://localhost:8000`
- Frontend React sur `http://localhost:5173` (via Vite)
- Grafana sur `http://localhost:3001`
- Prometheus sur `http://localhost:9090`

### 4. Appliquer les migrations

```bash
make migrate
```

### 5. Charger les données de test (optionnel)

```bash
make seed
```

## Accès aux interfaces

| Interface | URL | Description |
|---|---|---|
| Frontend | `http://localhost:5173` | Application React |
| API Swagger | `http://localhost:8000/docs` | Documentation interactive |
| API ReDoc | `http://localhost:8000/redoc` | Documentation de référence |
| Grafana | `http://localhost:3001` | Dashboards de monitoring |
| Prometheus | `http://localhost:9090` | Métriques |

## Workflow Excel → base de données

Pour importer des données depuis un fichier Excel :

```bash
# 1. Placer le fichier dans data/excel_test/
# 2. Extraire les données
make convert

# 3. Vérifier le JSON dans data/clean_extracts/
# 4. Si correct, le déplacer dans data/seed/
# 5. Seeder la base
make seed
```

## Commandes utiles

```bash
make help           # Liste toutes les commandes disponibles
make logs           # Suit les logs de tous les services
make test           # Lance la suite de tests
make migration msg="description"  # Crée une migration Alembic
make db-shell       # Ouvre un shell psql
```

Voir [toutes les commandes Make](development/makefile.md).
