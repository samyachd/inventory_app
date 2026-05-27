# Database restore runbook

Use this when the production database is in a state you want to undo:
catastrophic delete, broken migration, OCR job that mangled data, etc.

> **Decide first which kind of "rollback" you need.** This document covers
> *data restore*. If you want to undo a code release without losing recent
> data, see [§ Code rollback](#code-rollback) at the bottom — restoring a
> backup is the wrong tool for that.

---

## TL;DR

```bash
# Latest dump (yesterday's daily)
./deploy/restore.sh

# A specific point in time
./deploy/restore.sh /backups/daily/mairie-2026-05-05.sql.gz
./deploy/restore.sh /backups/weekly/mairie-2026-W18.sql.gz
./deploy/restore.sh /backups/monthly/mairie-2026-04.sql.gz
```

The script prompts for `RESTORE` confirmation, stops the backend, takes a
panic dump, restores, and restarts the backend.

---

## What's in the backup

The `db-backup` sidecar runs nightly via the `prodrigestivill/postgres-backup-local`
image and writes to `${BACKUP_TARGET}` (host path declared in `.env.prod`, default
`/var/backups/mairie`):

```
${BACKUP_TARGET}/
├── last/        # symlink-style: most recent dump only
├── daily/       # last 7 days
├── weekly/      # last 4 weeks
└── monthly/     # last 12 months
```

Each dump is a gzipped `pg_dump` (custom format with `--clean --if-exists`),
so it includes both schema and data — a full rebuild, not a delta.

---

## Step-by-step (what `restore.sh` does)

If the script ever needs debugging or you want to do this by hand:

```bash
# 1. Pause writers — backend is the only thing the app uses to write.
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  stop backend

# 2. Panic dump: save the current state in case the restore turns out to be
#    against a corrupted dump. Lives at /backups/last/<db>-latest.sql.gz.
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db-backup /backup.sh

# 3. Restore. /restore.sh defaults to /backups/last/. Pass an explicit path
#    to roll to a specific point in time.
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db-backup /restore.sh /backups/daily/mairie-2026-05-05.sql.gz

# 4. Restart writers and watch the logs.
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  start backend
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  logs -f backend
```

---

## Listing available dumps

```bash
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db-backup find /backups -name '*.sql.gz' -printf '%T@ %p\n' \
  | sort -n | awk '{print $2}'
```

Newest at the bottom.

---

## Test the backup, monthly

A backup you've never restored is Schrödinger's backup. Once a month, restore
the latest dump into a throwaway compose project and run a smoke check:

```bash
# 1. Bring up a side-by-side stack on a different project name and unmapped ports
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  up -d db db-backup

# 2. Restore into it (db-backup auto-restores from /backups/last/)
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db-backup /restore.sh

# 3. Smoke check: row counts should match prod ±today's writes
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT (SELECT count(*) FROM ordinateur) AS ordis,
              (SELECT count(*) FROM ecran)      AS ecrans,
              (SELECT count(*) FROM document)   AS docs;'

# 4. Tear down
COMPOSE_PROJECT_NAME=mairie-restore-test \
  docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  down -v
```

Add a calendar reminder, not automation — you want a human to eyeball the
counts.

---

## If the restore itself fails

The panic dump from step 2 is at `/backups/last/<db>-latest.sql.gz` and is
*newer* than any of the daily/weekly/monthly snapshots (they're rotated at
midnight). Re-run `restore.sh` pointing at it to get back to the broken
state, then escalate.

```bash
./deploy/restore.sh /backups/last/${POSTGRES_DB}-latest.sql.gz
```

---

## Code rollback

If what you actually want is "redeploy the previous app version":

```bash
# 1. Pin the previous image tag (replace <sha> with the previous commit SHA
#    you find under https://github.com/samyachd/mairie/pkgs/container/...)
sed -i 's|backend:latest|backend:<sha>|; s|frontend:latest|frontend:<sha>|' \
  docker-compose.prod.yml

# 2. Pull and recreate
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  pull backend frontend
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  up -d backend frontend

# 3. If the schema needs to revert too:
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec backend alembic downgrade -1
```

Only restore from a backup as a last resort here — you'll lose every write
that happened since the dump.
