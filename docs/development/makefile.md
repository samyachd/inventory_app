# Commandes Make

Toutes les commandes sont à exécuter depuis la racine du projet.

```bash
make help   # affiche la liste complète
```

## Stack

| Commande | Description |
|---|---|
| `make dev` | Démarre la stack en mode dev avec hot-reload (`docker compose up --build`) |
| `make devrun` | Démarre sans rebuild |
| `make prod` | Démarre en mode production |
| `make down` | Arrête tous les conteneurs |
| `make restart` | Redémarre (down + up --build) |

## Logs

| Commande | Description |
|---|---|
| `make logs` | Suit les logs de tous les services |
| `make logs-backend` | Logs du backend uniquement |
| `make logs-frontend` | Logs du frontend uniquement |

## Base de données

| Commande | Description |
|---|---|
| `make migration msg="..."` | Génère une migration Alembic avec autogenerate |
| `make migrate` | Applique les migrations en attente (`alembic upgrade head`) |
| `make seed` | Charge les données d'exemple (`utils/seed_example.py`) |
| `make db-reset` | ⚠️ Efface la DB, recrée le schéma et re-seed |
| `make db-shell` | Ouvre un shell `psql` dans le conteneur db |

## Développement

| Commande | Description |
|---|---|
| `make test` | Lance pytest dans le conteneur backend |
| `make backend-shell` | Shell bash dans le conteneur backend |
| `make convert` | Convertit Excel → JSON (`utils/convert_excel.py`) |
| `make clean` | Nettoie et transforme les données (`utils/clean_to_models.py`) |
| `make build-frontend` | Build le frontend pour la prod (local, sans Docker) |
