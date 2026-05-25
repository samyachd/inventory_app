# Migrations Alembic

Les migrations sont gérées avec **Alembic** et stockées dans `backend/alembic/versions/`.

## Commandes courantes

### Appliquer toutes les migrations en attente

```bash
make migrate
# ou directement :
docker compose exec backend uv run alembic upgrade head
```

### Créer une nouvelle migration

```bash
make migration msg="ajout colonne telephone"
# ou directement :
docker compose exec backend uv run alembic revision --autogenerate -m "ajout colonne telephone"
```

!!! warning "Vérifier la migration générée"
    Alembic détecte les changements automatiquement mais peut manquer certains cas (renommage de colonnes, contraintes complexes). Toujours inspecter le fichier généré dans `backend/alembic/versions/` avant d'appliquer.

### Revenir en arrière d'une migration

```bash
docker compose exec backend uv run alembic downgrade -1
```

### Voir la migration courante

```bash
docker compose exec backend uv run alembic current
```

### Voir l'historique des migrations

```bash
docker compose exec backend uv run alembic history --verbose
```

---

## Flux de développement

1. Modifier un modèle SQLAlchemy dans `backend/db/models/`
2. Générer la migration : `make migration msg="description"`
3. Vérifier le fichier généré dans `backend/alembic/versions/`
4. Appliquer : `make migrate`
5. Lancer les tests : `make test`

---

## Dépannage

### Migration partiellement appliquée

```bash
# Vérifier le marqueur en base
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT version_num FROM alembic_version;'

# Forcer le marqueur sans exécuter la migration
docker compose exec backend uv run alembic stamp head
```

### Conflit de révisions

Si plusieurs branches ont créé des migrations divergentes, Alembic refusera d'avancer. Créer une migration de merge :

```bash
docker compose exec backend uv run alembic merge heads -m "merge"
```

### Réinitialisation complète (dev uniquement)

```bash
make db-reset  # ⚠️ supprime toutes les données
```
