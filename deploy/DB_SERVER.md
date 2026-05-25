# Database server runbook

Everything needed to set up, operate, back up, and restore the PostgreSQL
server when it runs on a **dedicated host** separate from the application
server. Read this alongside [PROD.md](../PROD.md) — that document covers the
app server (Apache + Docker); this one covers the DB server only.

---

## Architecture reminder

```
  App server (Ubuntu 24.04)          DB server (Ubuntu 24.04)
  ────────────────────────           ────────────────────────
  Apache (TLS termination)           PostgreSQL 15 (native, systemd)
  Docker: frontend, backend    ────► port 5432
  Docker: prometheus, grafana,       cron: nightly pg_dump → NAS
          loki, promtail
```

The Docker `db` and `db-backup` services from the compose files are **not
used** in this layout. Everything in this document replaces them.

---

## 1. Install PostgreSQL

```bash
# On the DB server
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Verify:
```bash
sudo systemctl status postgresql    # should show "active (running)"
sudo -u postgres psql -c '\l'       # lists databases
```

---

## 2. Create the database and user

```bash
sudo -u postgres psql
```

```sql
CREATE USER mairie WITH PASSWORD 'your-strong-password';
CREATE DATABASE mairie OWNER mairie;
-- Confirm:
\l
\du
\q
```

Use the same `POSTGRES_PASSWORD` value you put in `.env.prod` on the app
server. Generate a strong one if you haven't yet:
```bash
openssl rand -base64 24
```

---

## 3. Allow remote connections from the app server

PostgreSQL listens only on `localhost` by default. Two files to edit:

### `postgresql.conf`

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and change:
```
listen_addresses = '*'          # was 'localhost'
```

Or restrict to just the app server's IP (more secure):
```
listen_addresses = '127.0.0.1,<app-server-ip>'
```

### `pg_hba.conf`

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add this line at the end (replace `<app-server-ip>` with the actual IP):
```
host  mairie  mairie  <app-server-ip>/32  scram-sha-256
```

### Apply changes

```bash
sudo systemctl reload postgresql
```

### Test from the app server

```bash
# Run this on the APP server, not the DB server
psql -h <db-server-ip> -U mairie -d mairie -c 'SELECT version();'
```

---

## 4. Firewall

Allow only the app server to reach port 5432:

```bash
# On the DB server
sudo ufw allow from <app-server-ip> to any port 5432
sudo ufw enable
sudo ufw status
```

---

## 5. Mount the NAS (backup target)

The NAS mount goes on the **DB server** (not the app server) since that is
where `pg_dump` runs.

```bash
sudo apt-get install -y cifs-utils

sudo mkdir -p /mnt/mairie-backups

# NAS credentials file (root-only)
sudo bash -c 'cat > /etc/cifs-mairie <<EOF
username=<nas-user>
password=<nas-password>
domain=<windows-domain-or-empty>
EOF'
sudo chmod 600 /etc/cifs-mairie

# Add to /etc/fstab
sudo bash -c 'cat >> /etc/fstab <<EOF
//nas.mairie.local/sauvegardes/mairie /mnt/mairie-backups cifs credentials=/etc/cifs-mairie,vers=3.0,uid=0,gid=0  0  0
EOF'

sudo mount -a
ls /mnt/mairie-backups   # should not error
```

---

## 6. Backup script

Create `/usr/local/bin/mairie-backup.sh` on the DB server:

```bash
sudo nano /usr/local/bin/mairie-backup.sh
```

```bash
#!/bin/bash
set -euo pipefail

DB_USER="mairie"
DB_NAME="mairie"
BACKUP_DIR="/mnt/mairie-backups"
DATE=$(date +%Y-%m-%dT%H:%M:%S)
DUMP="$BACKUP_DIR/last/${DB_NAME}-latest.sql.gz"

mkdir -p "$BACKUP_DIR"/{last,daily,weekly,monthly}

# Full dump (schema + data, --clean lets restore drop objects first)
pg_dump -U "$DB_USER" "$DB_NAME" --clean --if-exists | gzip -9 > "$DUMP"

# Verify the dump is not corrupt before rotating
gunzip -t "$DUMP" || { echo "ERROR: dump is corrupt, aborting rotation" >&2; exit 1; }

# Daily copy (keep last 7)
cp "$DUMP" "$BACKUP_DIR/daily/${DB_NAME}-${DATE}.sql.gz"
ls -t "$BACKUP_DIR/daily/" | tail -n +8 | xargs -r -I{} rm "$BACKUP_DIR/daily/{}"

# Weekly copy on Mondays (keep last 4)
if [[ $(date +%u) == 1 ]]; then
    cp "$DUMP" "$BACKUP_DIR/weekly/${DB_NAME}-${DATE}.sql.gz"
    ls -t "$BACKUP_DIR/weekly/" | tail -n +5 | xargs -r -I{} rm "$BACKUP_DIR/weekly/{}"
fi

# Monthly copy on the 1st (keep last 12)
if [[ $(date +%d) == 01 ]]; then
    cp "$DUMP" "$BACKUP_DIR/monthly/${DB_NAME}-${DATE}.sql.gz"
    ls -t "$BACKUP_DIR/monthly/" | tail -n +13 | xargs -r -I{} rm "$BACKUP_DIR/monthly/{}"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') backup OK — $(du -sh "$DUMP" | cut -f1)"
```

```bash
sudo chmod +x /usr/local/bin/mairie-backup.sh
```

Allow the `postgres` system user to run `pg_dump` without a password prompt:

```bash
sudo bash -c 'echo "localhost:5432:mairie:mairie:your-strong-password" \
    > /var/lib/postgresql/.pgpass'
sudo chmod 600 /var/lib/postgresql/.pgpass
sudo chown postgres:postgres /var/lib/postgresql/.pgpass
```

Test it manually:
```bash
sudo -u postgres /usr/local/bin/mairie-backup.sh
ls -lh /mnt/mairie-backups/last/
```

---

## 7. Schedule the backup (cron)

```bash
sudo crontab -u postgres -e
```

Add:
```
0 0 * * * /usr/local/bin/mairie-backup.sh >> /var/log/mairie-backup.log 2>&1
```

Midnight every day, output to log. Check the log the morning after the first
run:
```bash
tail -f /var/log/mairie-backup.log
```

---

## 8. App server compose changes

On the **app server**, edit `.env.prod` and change:

```
POSTGRES_HOST=<db-server-ip>    # was "db"
```

In `docker-compose.prod.yml`, remove the hardcoded override so the env file
value takes effect — delete or comment out:
```yaml
# environment:
#   POSTGRES_HOST: db     ← remove this line from the backend service
```

Also remove (or comment out) the `db`, `db-backup` services and the
`depends_on: db` conditions from both compose files, since Postgres is now
external. The backend healthcheck startup order is handled by the retry
logic in the app itself.

---

## Daily operations

### Check PostgreSQL is running

```bash
sudo systemctl status postgresql
```

### Connect to the database

```bash
sudo -u postgres psql -d mairie

# Or from the app server (requires psql installed there):
psql -h <db-server-ip> -U mairie -d mairie
```

### Useful queries

```sql
-- Row counts (smoke check)
SELECT
  (SELECT count(*) FROM ordinateur) AS ordis,
  (SELECT count(*) FROM ecran)      AS ecrans,
  (SELECT count(*) FROM document)   AS docs;

-- Database size
SELECT pg_size_pretty(pg_database_size('mairie'));

-- Active connections
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'mairie';

-- Kill a stuck connection
SELECT pg_terminate_backend(<pid>);
```

### Check backup log

```bash
tail -50 /var/log/mairie-backup.log

# List all available dumps
find /mnt/mairie-backups -name '*.sql.gz' | sort
```

### Force an immediate backup

```bash
sudo -u postgres /usr/local/bin/mairie-backup.sh
```

---

## Restore

### TL;DR

```bash
# Latest dump
sudo -u postgres /usr/local/bin/mairie-restore.sh

# Specific point in time
sudo -u postgres /usr/local/bin/mairie-restore.sh \
    /mnt/mairie-backups/daily/mairie-2026-05-10T00:00:00.sql.gz
```

### Create the restore script

```bash
sudo nano /usr/local/bin/mairie-restore.sh
```

```bash
#!/bin/bash
set -euo pipefail

DB_USER="mairie"
DB_NAME="mairie"
BACKUP_DIR="/mnt/mairie-backups"
DUMP="${1:-$BACKUP_DIR/last/${DB_NAME}-latest.sql.gz}"

if [[ ! -f "$DUMP" ]]; then
    echo "ERROR: dump not found: $DUMP" >&2
    echo "Available dumps:" >&2
    find "$BACKUP_DIR" -name '*.sql.gz' | sort >&2
    exit 1
fi

echo "About to restore database '${DB_NAME}' from:"
echo "  $DUMP  ($(du -sh "$DUMP" | cut -f1))"
echo "This will REPLACE all current data."
read -rp "Type RESTORE in capitals to confirm: " CONFIRM
[[ "$CONFIRM" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

# Safety dump before restoring
SAFETY="$BACKUP_DIR/last/${DB_NAME}-pre-restore.sql.gz"
echo "→ Taking a safety dump to $SAFETY …"
pg_dump -U "$DB_USER" "$DB_NAME" --clean --if-exists | gzip -9 > "$SAFETY"

echo "→ Restoring from $DUMP …"
gunzip -c "$DUMP" | psql -U "$DB_USER" -d "$DB_NAME"

echo "→ Done. Verify row counts:"
psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT (SELECT count(*) FROM ordinateur) AS ordis,
          (SELECT count(*) FROM ecran)      AS ecrans,
          (SELECT count(*) FROM document)   AS docs;"
```

```bash
sudo chmod +x /usr/local/bin/mairie-restore.sh
```

### Full restore procedure

1. **Stop the backend** on the app server (prevents writes during restore):
   ```bash
   # On the APP server
   docker compose --env-file .env.prod \
     -f docker-compose.yml -f docker-compose.prod.yml \
     stop backend
   ```

2. **Run the restore** on the DB server:
   ```bash
   # On the DB server
   sudo -u postgres /usr/local/bin/mairie-restore.sh
   # or pass a specific dump path as argument
   ```

3. **Restart the backend** on the app server:
   ```bash
   # On the APP server
   docker compose --env-file .env.prod \
     -f docker-compose.yml -f docker-compose.prod.yml \
     start backend
   docker compose --env-file .env.prod \
     -f docker-compose.yml -f docker-compose.prod.yml \
     logs -f backend
   ```

---

## Test the backup, monthly

A backup you've never restored is Schrödinger's backup.

```bash
# On the DB server — restore into a separate test database
sudo -u postgres psql -c "CREATE DATABASE mairie_test OWNER mairie;"
gunzip -c /mnt/mairie-backups/last/mairie-latest.sql.gz \
    | sudo -u postgres psql -d mairie_test

# Smoke check
sudo -u postgres psql -d mairie_test -c \
  "SELECT (SELECT count(*) FROM ordinateur) AS ordis,
          (SELECT count(*) FROM ecran)      AS ecrans,
          (SELECT count(*) FROM document)   AS docs;"

# Compare with prod counts
sudo -u postgres psql -d mairie -c \
  "SELECT (SELECT count(*) FROM ordinateur) AS ordis,
          (SELECT count(*) FROM ecran)      AS ecrans,
          (SELECT count(*) FROM document)   AS docs;"

# Drop the test database when done
sudo -u postgres psql -c "DROP DATABASE mairie_test;"
```

---

## Security checklist

| What | When | How |
|---|---|---|
| Rotate `POSTGRES_PASSWORD` | Yearly | `ALTER USER mairie WITH PASSWORD '...';` then update `.env.prod` on the app server and restart the backend. |
| Review `pg_hba.conf` | After any infra change | Make sure only the app server IP is listed. `sudo cat /etc/postgresql/15/main/pg_hba.conf` |
| TLS for the Postgres connection | If the servers are not on a private LAN | Set `ssl = on` in `postgresql.conf` and use `sslmode=require` in `DATABASE_URL`. |
| Test restore | Monthly | See section above. |
| Update PostgreSQL minor version | Monthly | `sudo apt-get update && sudo apt-get upgrade postgresql` |

---

## Troubleshooting

### Backend cannot connect to Postgres

```bash
# From the app server — check network reachability
nc -zv <db-server-ip> 5432

# Check pg_hba.conf has the app server's IP
sudo grep -n mairie /etc/postgresql/15/main/pg_hba.conf

# Check PostgreSQL is listening on the right address
sudo ss -tlnp | grep 5432

# Check the PostgreSQL log
sudo tail -50 /var/log/postgresql/postgresql-15-main.log
```

### Backup cron did not run

```bash
# Was cron running?
sudo systemctl status cron

# Check the log
tail -100 /var/log/mairie-backup.log

# Check the NAS is mounted
mountpoint /mnt/mairie-backups
ls /mnt/mairie-backups

# Run manually to see the error
sudo -u postgres /usr/local/bin/mairie-backup.sh
```

### `pg_dump` permission denied

```bash
# Check the .pgpass file is correct and owned by postgres
sudo ls -la /var/lib/postgresql/.pgpass
sudo cat /var/lib/postgresql/.pgpass
# Format must be: hostname:port:database:username:password
```
