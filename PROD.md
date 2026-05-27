# Production runbook

Everything you need to deploy, operate, and troubleshoot the inventory app
in production. For data-restore specifics see [deploy/RESTORE.md](deploy/RESTORE.md).

---

## Architecture

```
  App server
  ┌─────────────────────────────────────────────────────┐
  │  Apache (host)        — TLS termination, port 443  │◄── public HTTPS
  │   ↓ proxies → 127.0.0.1:80                          │
  ├─────────────────────────────────────────────────────┤
  │  frontend (container)  — nginx, serves the SPA     │
  │   ↓ proxies /api/* → backend:8000                   │
  ├─────────────────────────────────────────────────────┤
  │  backend (container)   — FastAPI, 4 uvicorn workers│
  │   ↓ → db:5432                                       │
  ├─────────────────────────────────────────────────────┤
  │  db (container)        — PostgreSQL 16              │
  │  db-backup (container) — nightly pg_dump → host dir │
  └─────────────────────────────────────────────────────┘

  Observability (internal-only):
    prometheus → scrapes backend:8000/metrics
    promtail   → scrapes Docker logs → loki-proxy (basic auth) → loki
    grafana    → reads loki + prometheus
```

All services run in Docker on a single host. Only Apache on the host is
exposed on the public network. Grafana/Prometheus/Loki are reachable via
SSH tunnel or by adding paths to the Apache vhost behind basic auth.

---

## Prerequisites

- Debian/Ubuntu 22.04+
- Docker 24+ and `docker compose` v2
- Apache 2.4 with `mod_ssl`, `mod_proxy`, `mod_proxy_http`, `mod_headers`,
  `mod_rewrite`, `mod_remoteip`
- `apache2-utils` (for `htpasswd`)
- `certbot` + `python3-certbot-apache`
- A domain pointing to the host (A/AAAA record)
- A personal access token with `read:packages` scope on GHCR if the images
  are private (skip if public)

---

## File layout

```
/home/<user>/mairie/                    ← git checkout
├── .env.prod                           ← gitignored, see .env.prod.example
├── backend/.env.prod                   ← gitignored, see backend/.env.prod.example
├── loki-proxy/htpasswd                 ← gitignored, generated with htpasswd
├── prometheus-web.yml                  ← gitignored, copy from .example
├── docker-compose.yml
├── docker-compose.prod.yml
└── deploy/
    └── apache/mairie.conf              ← copy to /etc/apache2/sites-available/
/etc/apache2/sites-available/mairie.conf ← copied from the repo
/etc/letsencrypt/live/<domain>/         ← TLS certs from certbot
/var/backups/mairie/                    ← db-backup container writes dumps here
└── daily/, weekly/, monthly/, last/
```

---

## First-time deployment

```bash
# 1. Clone and prepare
git clone https://github.com/samyachd/mairie.git
cd mairie

# 2. Configure env (gitignored, host-specific)
cp .env.prod.example .env.prod
cp backend/.env.prod.example backend/.env.prod
# Edit both. Key values:
#   POSTGRES_PASSWORD: openssl rand -base64 24
#   GRAFANA_ADMIN_PASSWORD: openssl rand -base64 16
#   SECRET_KEY: openssl rand -hex 32
#   MISTRAL_API_KEY: from https://console.mistral.ai/
#   LOKI_BASIC_AUTH=mairie:<password>   (matches step 3 below)
#   PROMETHEUS_ADMIN_PASSWORD: openssl rand -base64 16

# 3. Loki basic-auth credentials
sudo apt-get install -y apache2-utils
htpasswd -nbB mairie '<password-from-LOKI_BASIC_AUTH>' > loki-proxy/htpasswd
chmod 600 loki-proxy/htpasswd

# 4. Prometheus basic-auth (web.yml with bcrypt hash)
cp prometheus-web.yml.example prometheus-web.yml
# Generate hash and paste it into prometheus-web.yml:
#   python3 -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt(12)).decode())"
# Use the same plain-text password as PROMETHEUS_ADMIN_PASSWORD in .env.prod
chmod 600 prometheus-web.yml

# 5. Create the backup directory (mounted by the db-backup container)
sudo mkdir -p /var/backups/mairie

# 6. Authenticate to GHCR (skip if images are public)
echo "$GHCR_TOKEN" | docker login ghcr.io -u samyachd --password-stdin

# 7. Pull and start
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml up -d

# 8. Run migrations (always before opening to traffic)
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec backend alembic upgrade head

# 9. Wire up Apache + TLS
sudo cp deploy/apache/mairie.conf /etc/apache2/sites-available/mairie.conf
# Edit the file: replace "inventaire.mairie.example.fr" with the real domain.
sudo a2enmod ssl proxy proxy_http headers rewrite remoteip
sudo a2ensite mairie
sudo a2dissite 000-default      # if it conflicts on :80
sudo apache2ctl configtest
sudo systemctl reload apache2
sudo certbot --apache -d <your-domain>

# 10. Smoke check from another machine
curl -i https://<your-domain>/                     # 200 + HTML
curl -i https://<your-domain>/api/                 # 200 + {"status":"ok",...}
```

The default admin login is whatever the seed step creates (see
[backend/db/seed.py](backend/db/seed.py)). **Change it immediately** via
the UI.

---

## Configuration files

### Host files

| File | Owner | Tracked | Purpose |
|---|---|---|---|
| `/.env.prod` | host | gitignored | `POSTGRES_*`, `GRAFANA_ADMIN_PASSWORD`, `LOKI_BASIC_AUTH`, `PROMETHEUS_ADMIN_PASSWORD`, `BACKUP_TARGET` |
| `/backend/.env.prod` | host | gitignored | `SECRET_KEY`, `MISTRAL_API_KEY`, `CORS_ORIGINS`, `DEBUG=false`, `MISTRAL_MODEL` |
| `/loki-proxy/htpasswd` | host | gitignored | bcrypt entry for the Loki basic-auth user |
| `/prometheus-web.yml` | host | gitignored | bcrypt entry for the Prometheus basic-auth user |
| `/etc/apache2/sites-available/mairie.conf` | host | template tracked at `deploy/apache/mairie.conf` | TLS termination + reverse proxy |
| `/etc/letsencrypt/live/<domain>/*` | host | n/a | TLS cert (managed by certbot) |
| `prometheus.prod.yml`, `promtail.prod.yml` | repo | tracked | observability config |

`docker compose` invocations always need `--env-file .env.prod` so that
`${LOKI_BASIC_AUTH}` and `${PROMETHEUS_ADMIN_PASSWORD}` interpolate at parse time.
The `env_file:` directive inside compose only injects vars *into the
container*, not into compose's own variable substitution.

---

## Daily operations

### Update to the latest release

CI publishes both images on every push to `main` (see
[.github/workflows/build-and-push.yml](.github/workflows/build-and-push.yml)).

```bash
cd /home/<user>/mairie
git pull
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml up -d

# If the release includes a new migration:
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec backend alembic upgrade head
```

`up -d` on already-running services is a no-op for unchanged ones; only
the pulled images get recreated. Healthchecks gate startup order so
frontend waits for backend. The DB is external so no compose dependency.

### Tail logs

```bash
COMPOSE="docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE logs -f backend                 # one service
$COMPOSE logs -f --tail 100 backend frontend
$COMPOSE logs -f --since 10m             # last 10 minutes, all services
```

### Service status

```bash
$COMPOSE ps                              # everything
$COMPOSE ps --status running
$COMPOSE ps --status unhealthy           # the firefighting view
```

### Run a migration

```bash
$COMPOSE exec backend alembic current        # current revision
$COMPOSE exec backend alembic history --verbose
$COMPOSE exec backend alembic upgrade head
$COMPOSE exec backend alembic downgrade -1
```

### Hand-roll a one-off Postgres query

```bash
$COMPOSE exec db psql -U mairie -d mairie
# or a one-liner:
$COMPOSE exec db psql -U mairie -d mairie -c 'SELECT count(*) FROM ordinateur;'
```

### Force an immediate backup

```bash
$COMPOSE exec db-backup /backup.sh
ls -lh /var/backups/mairie/last/
```

---

## Backups

Backups are managed by the `db-backup` container (`prodrigestivill/postgres-backup-local`)
which runs a nightly `pg_dump` and writes to `${BACKUP_TARGET}` on the host:

- `daily/`   — last 7 dumps
- `weekly/`  — last 4 weeks
- `monthly/` — last 12 months
- `last/`    — most recent dump (overwritten each run)

Dumps are gzipped `pg_dump --clean --if-exists` (full schema + data).

**Test the restore monthly.** A backup you've never restored is
Schrödinger's backup. See [deploy/RESTORE.md](deploy/RESTORE.md).

---

## Restore / rollback

Two different things share the word "rollback":

- **Data is broken** (bad migration, accidental delete, runaway OCR job)
  → restore from a dump → see [deploy/RESTORE.md](deploy/RESTORE.md).
  TL;DR: `./deploy/restore.sh`.
- **Code release is broken**, data is still good → redeploy a previous
  image tag, optionally `alembic downgrade`. See the
  [Code rollback section](deploy/RESTORE.md#code-rollback) in RESTORE.md.

---

## Observability

Nothing is publicly exposed. Two ways to reach Grafana:

**SSH tunnel** (preferred for occasional access):
```bash
ssh -L 3000:localhost:3001 user@host    # 3001 is the host-side mapping
# then open http://localhost:3000 in the browser
```

**Apache subpath with basic auth** (preferred for daily use):
add a `<Location /grafana>` block to `mairie.conf` that proxies to
`http://127.0.0.1:3001/` with `AuthType Basic`. Same pattern for
prometheus on `/prometheus` if you want it.

### First Grafana setup

1. Log in: `admin` / `${GRAFANA_ADMIN_PASSWORD}` (from `.env.prod`).
   Force a password change on first login.
2. Add **Loki** data source: URL `http://loki-proxy:3100`, toggle
   *Basic auth* on, user/password = `LOKI_BASIC_AUTH` from `.env.prod`.
3. Add **Prometheus** data source: URL `http://prometheus:9090`, toggle
   *Basic auth* on, user `admin`, password = `PROMETHEUS_ADMIN_PASSWORD` from `.env.prod`.
4. Create or import dashboards. Logs are labelled `{service="backend"}`,
   `{service="frontend"}`, etc.

---

## Security checklist

| What | When | How |
|---|---|---|
| Rotate `SECRET_KEY` | Yearly or after a breach | Edit `backend/.env.prod`, restart backend. **Existing JWTs become invalid** — users re-login. |
| Rotate `POSTGRES_PASSWORD` | Yearly | `$COMPOSE exec db psql -U mairie -c "ALTER USER mairie WITH PASSWORD '...'"`, update `.env.prod`, restart backend and db. |
| Rotate `MISTRAL_API_KEY` | When key leaks | Mistral dashboard, edit `backend/.env.prod`, restart backend. |
| Rotate `LOKI_BASIC_AUTH` | Yearly | Regenerate `loki-proxy/htpasswd`, update `.env.prod`, restart `loki-proxy` + `promtail`. Update Grafana data source. |
| Rotate `PROMETHEUS_ADMIN_PASSWORD` | Yearly | Regenerate bcrypt hash in `prometheus-web.yml`, update `.env.prod`, restart `prometheus` + `grafana`. Update Grafana data source. |
| Rotate `GRAFANA_ADMIN_PASSWORD` | Use Grafana's own UI | Edit `.env.prod` only matters for first-boot, after that Grafana stores the password. |
| TLS renewal | Auto | `certbot.timer` runs twice daily. Verify: `sudo systemctl status certbot.timer`. |
| Test restore | Monthly | See RESTORE.md |
| Update base images | Monthly | `docker compose pull && docker compose up -d` triggers a rebuild on next CI push; locally pull pulls new postgres/grafana/etc. images. |

---

## Troubleshooting

### `backend` is `unhealthy` after deploy

```bash
$COMPOSE logs --tail 200 backend
```

Common causes:
- **Pydantic validation error at boot** — missing env var. Compare your
  `backend/.env.prod` against `backend/.env.prod.example` and check
  `docker compose --env-file .env.prod ... config` shows the variable
  resolved.
- **Connection refused to DB** — check the `db` container is healthy:
  `$COMPOSE ps db` and `$COMPOSE logs --tail 50 db`
- **Migration mismatch** — backend startup does not run migrations; do it
  manually after every release.

### 502 from Apache

```bash
sudo tail -f /var/log/apache2/mairie_error.log
docker ps                                # is the frontend container running?
curl -i http://127.0.0.1:80/             # does the container itself respond?
```

If `127.0.0.1:80` works but the public URL doesn't, the issue is in the
Apache vhost. If `127.0.0.1:80` fails, the frontend container is down or
not listening.

### `docker compose pull` fails with 401

GHCR token expired or unset. Re-run:
```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u samyachd --password-stdin
```

### Backup container wrote nothing

```bash
$COMPOSE logs --tail 50 db-backup
ls -lh /var/backups/mairie/last/
$COMPOSE exec db-backup /backup.sh   # run manually to see the error
```

### Loki returns 401 to Grafana / Promtail

```bash
$COMPOSE exec loki-proxy cat /etc/nginx/htpasswd      # bcrypt entry
echo "$LOKI_BASIC_AUTH"                                # the literal pair from .env.prod
```

The username and password in the htpasswd file must match `LOKI_BASIC_AUTH`
exactly. Regenerate with `htpasswd -nbB <user> <password>` and restart
`loki-proxy`.

### Migration is stuck / partially applied

```bash
$COMPOSE exec backend alembic current
# Check the DB directly:
$COMPOSE exec db psql -U mairie -d mairie -c 'SELECT version_num FROM alembic_version;'

$COMPOSE exec backend alembic stamp head       # mark as applied without running
$COMPOSE exec backend alembic stamp <revision> # roll the marker to a specific point
```

If unsure: stop the backend, restore from the latest dump (which includes
the schema), then carefully retry the migration.

---

## Quick reference

```bash
# Always prepend to compose commands in prod:
COMPOSE="docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE up -d                            # start everything
$COMPOSE down                             # stop everything (keeps volumes)
$COMPOSE pull && $COMPOSE up -d           # update
$COMPOSE exec backend alembic upgrade head
$COMPOSE logs -f backend
$COMPOSE ps
# Restore: on the DB server → sudo -u postgres /usr/local/bin/mairie-restore.sh
```
