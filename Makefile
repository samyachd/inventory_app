.PHONY: help dev prod deploy down restart logs status \
        migration migrate seed db-reset db-shell backup \
        backend-shell test lint convert clean \
        build-frontend export-ocr

# Usage: make <target> ou ENV=prod make <target>
ENV ?= dev
ifeq ($(ENV),prod)
  DC = docker compose -f docker-compose.yml -f docker-compose.prod.yml
else
  DC = docker compose
endif

help:  ## Affiche la liste des commandes disponibles
	@echo ""
	@echo "Commandes disponibles (ENV=$(ENV)) :"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

dev:  ## Démarre la stack en mode dev (avec hot-reload)
	docker compose up --build

prod:  ## Démarre la stack en mode prod
	$(DC) up -d

deploy:  ## [PROD] git pull + rebuild images + redémarre
	git pull
	$(DC) build --no-cache
	$(DC) up -d

down:  ## Arrête tous les conteneurs
	$(DC) down

restart:  ## Redémarre la stack (down + up)
	$(DC) down
	$(DC) up --build -d

logs:  ## Suit les logs (usage : make logs ou make logs s=backend)
	$(DC) logs -f $(s)

migration:  ## Génère une migration Alembic (usage : make migration msg="...")
	$(DC) exec backend uv run alembic revision --autogenerate -m "$(msg)"

migrate:  ## Applique les migrations en attente
	$(DC) exec backend uv run alembic upgrade head

seed:  ## Remplit la DB avec des données de test
	$(DC) exec backend uv run python -m db.seed

db-reset:  ## ⚠️  Backup + efface la DB, recrée le schéma et re-seed
	@$(MAKE) backup
	$(DC) down -v
	$(DC) up -d
	@echo "Attente du démarrage de Postgres..."
	@sleep 5
	$(DC) exec backend uv run alembic upgrade head
	$(DC) exec backend uv run python -m db.seed

db-shell:  ## Ouvre un shell psql dans la DB
	$(DC) exec db sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

test:  ## Lance les tests pytest
	$(DC) exec backend uv run pytest

backend-shell:  ## Ouvre un shell bash dans le conteneur backend
	$(DC) exec backend bash

convert:  ## Convertit Excel → JSON brut
	$(DC) exec -u root backend uv run python -m utils.convert_excel

clean:  ## Nettoie et normalise le JSON brut
	$(DC) exec -u root backend uv run python -m utils.clean_to_models

build-frontend:  ## Build le frontend pour la prod (local, sans Docker)
	cd frontend && npm run build

status:  ## Affiche l'état des conteneurs
	$(DC) ps

backup:  ## Sauvegarde la DB en SQL (services/)
	@mkdir -p services
	$(DC) exec db sh -c 'pg_dump -U $$POSTGRES_USER -d $$POSTGRES_DB' > services/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup sauvegardé dans services/"

lint:  ## Lint le backend avec ruff
	$(DC) exec backend uv run ruff check .

export-ocr:  ## Exporte les résultats OCR en JSON (data/ocr_results/)
	@mkdir -p data/ocr_results
	$(DC) exec -T backend uv run python -m services.export_ocr_results > data/ocr_results/ocr_results_$$(date +%Y%m%d_%H%M%S).json

.DEFAULT_GOAL := help
