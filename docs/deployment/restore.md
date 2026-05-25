# Restauration de la base de données

À utiliser quand la base de données est dans un état à annuler : suppression catastrophique, migration cassée, job OCR qui a altéré des données.

!!! tip "Bon à savoir"
    Ce document couvre la **restauration des données**. Pour annuler une release de code sans perdre de données récentes, voir [Rollback de code](#rollback-de-code).

## TL;DR

```bash
# Dernier dump (dump de la nuit précédente)
./deploy/restore.sh

# Un point précis dans le temps
./deploy/restore.sh /backups/daily/mairie-2026-05-05.sql.gz
./deploy/restore.sh /backups/weekly/mairie-2026-W18.sql.gz
./deploy/restore.sh /backups/monthly/mairie-2026-04.sql.gz
```

Le script demande confirmation, arrête le backend, prend un dump de panique, restaure, et redémarre le backend.

## Structure des sauvegardes

Le sidecar `db-backup` tourne nightly et écrit dans `${BACKUP_TARGET}` (montage NAS) :

```
${BACKUP_TARGET}/
├── last/        # dump le plus récent (écrasé à chaque run)
├── daily/       # 7 derniers jours
├── weekly/      # 4 dernières semaines
└── monthly/     # 12 derniers mois
```

Chaque dump est un `pg_dump` gzippé (`--clean --if-exists`) — schéma + données complets.

## Étape par étape (manuel)

```bash
COMPOSE="docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"

# 1. Arrêter les writers
$COMPOSE stop backend

# 2. Dump de panique (sauvegarde l'état actuel)
$COMPOSE exec db-backup /backup.sh

# 3. Restaurer
$COMPOSE exec db-backup /restore.sh /backups/daily/mairie-2026-05-05.sql.gz

# 4. Redémarrer et surveiller
$COMPOSE start backend
$COMPOSE logs -f backend
```

## Lister les dumps disponibles

```bash
$COMPOSE exec db-backup find /backups -name '*.sql.gz' -printf '%T@ %p\n' \
  | sort -n | awk '{print $2}'
```

Le plus récent est en bas.

## Test mensuel de la restauration

```bash
# 1. Stack de test isolée
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  up -d db db-backup

# 2. Restaurer
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db-backup /restore.sh

# 3. Vérifier les comptages (doit correspondre à la prod ± les écritures du jour)
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT (SELECT count(*) FROM ordinateur) AS ordis,
              (SELECT count(*) FROM ecran)      AS ecrans,
              (SELECT count(*) FROM document)   AS docs;'

# 4. Nettoyer
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  down -v
```

## Si la restauration échoue

Le dump de panique est dans `/backups/last/<db>-latest.sql.gz` — il est plus récent que les dumps daily/weekly. Relancer `restore.sh` en pointant dessus :

```bash
./deploy/restore.sh /backups/last/${POSTGRES_DB}-latest.sql.gz
```

## Rollback de code

Pour redéployer la version précédente sans toucher aux données :

```bash
# 1. Épingler le tag d'image précédent (trouver le SHA dans GHCR)
sed -i 's|backend:latest|backend:<sha>|; s|frontend:latest|frontend:<sha>|' \
  docker-compose.prod.yml

# 2. Redéployer
$COMPOSE pull backend frontend
$COMPOSE up -d backend frontend

# 3. Si le schéma doit aussi revenir :
$COMPOSE exec backend alembic downgrade -1
```

Ne restaurer depuis un backup que **en dernier recours** — toutes les écritures depuis le dump seront perdues.
