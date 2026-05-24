.PHONY: help dev prod down restart logs logs-backend logs-frontend \
        migration migrate seed db-reset db-shell \
        backend-shell test convert \
        build-frontend

help:  ## Affiche la liste des commandes disponibles
	@echo ""
	@echo "Commandes disponibles :"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

dev:  ## Démarre la stack en mode dev (avec hot-reload)
	docker compose up --build

devrun:
	docker compose up

prod:  ## Démarre la stack en mode prod
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

down:  ## Arrête tous les conteneurs
	docker compose down

restart:  ## Redémarre la stack (down + up)
	docker compose down
	docker compose up --build -d

logs:  ## Suit les logs de tous les services
	docker compose logs -f

logs-backend:  ## Suit les logs du backend uniquement
	docker compose logs -f backend

logs-frontend:  ## Suit les logs du frontend uniquement
	docker compose logs -f frontend

migration:  ## Génère une nouvelle migration Alembic (usage : make migration msg="ma migration")
	docker compose exec backend uv run alembic revision --autogenerate -m "$(msg)"

migrate:  ## Applique les migrations en attente
	docker compose exec backend uv run alembic upgrade head

seed:  ## Remplit la DB avec des données de test
	docker compose exec backend uv run python -m db.seed

db-reset:  ## ⚠️  Efface la DB, recrée le schéma et re-seed
	docker compose down -v
	docker compose up -d
	@echo "Attente du démarrage de Postgres..."
	@sleep 5
	docker compose exec backend uv run alembic upgrade head
	docker compose exec backend uv run python -m db.seed

db-shell:  ## Ouvre un shell psql dans la DB
	docker compose exec db sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

test:  ## Lance les tests pytest dans le conteneur backend
	docker compose exec backend uv run pytest

backend-shell:  ## Ouvre un shell bash dans le conteneur backend
	docker compose exec backend bash

convert:  ## Convertit Excel en JSON (utilitaire)
	docker compose exec -u root backend uv run python -m utils.convert_excel

clean:
	docker compose exec -u root backend uv run python -m utils.clean_to_models

build-frontend:  ## Build le frontend pour la prod (local, sans Docker)
	cd frontend && npm run build

# Cible par défaut (quand on tape juste "make")
.DEFAULT_GOAL := help