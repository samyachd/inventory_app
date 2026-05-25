# Déploiement en production

## Architecture

```
                ┌─────────────────────────────────────────────────────┐
   public       │  Apache (host)        — TLS termination, port 443  │
  HTTPS ───────►│   ↓ proxies / → 127.0.0.1:80                       │
                ├─────────────────────────────────────────────────────┤
                │  frontend (container)  — nginx, sert la SPA React  │
                │   ↓ proxies /api/* → backend:8000                   │
                ├─────────────────────────────────────────────────────┤
                │  backend (container)   — FastAPI, 4 workers uvicorn│
                │   ↓                                                 │
                │  db (container)        — PostgreSQL 15              │
                │   ↑ dumps nightly                                   │
                │  db-backup (container) — écrit sur /backups (NAS)  │
                └─────────────────────────────────────────────────────┘
```

Seul Apache sur l'hôte est exposé publiquement. Grafana/Prometheus/Loki ne sont accessibles que via tunnel SSH ou subpath Apache protégé.

## Prérequis sur l'hôte

- Debian/Ubuntu 22.04+
- Docker 24+ et `docker compose` v2
- Apache 2.4 avec `mod_ssl`, `mod_proxy`, `mod_proxy_http`, `mod_headers`, `mod_rewrite`, `mod_remoteip`
- `apache2-utils` (pour `htpasswd`)
- `certbot` + `python3-certbot-apache`
- Un domaine pointant sur le serveur (enregistrement A/AAAA)
- Un point de montage SMB/NFS pour les sauvegardes (NAS)
- Un token GitHub Container Registry (`read:packages`) si les images sont privées

## Premier déploiement

```bash
# 1. Cloner et configurer
git clone https://github.com/samyachd/mairie.git
cd mairie
cp .env.prod.example .env.prod
cp backend/.env.prod.example backend/.env.prod
```

Éditer `.env.prod` :

| Variable | Description | Commande de génération |
|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `openssl rand -base64 24` |
| `GRAFANA_ADMIN_PASSWORD` | Mot de passe Grafana | `openssl rand -base64 16` |
| `BACKUP_TARGET` | Chemin du point de montage NAS | ex: `/mnt/mairie-backups` |
| `LOKI_BASIC_AUTH` | `user:password` pour Loki | — |

Éditer `backend/.env.prod` :

| Variable | Description | Commande de génération |
|---|---|---|
| `SECRET_KEY` | Clé de signature JWT | `openssl rand -hex 32` |
| `MISTRAL_API_KEY` | Clé API Mistral | console.mistral.ai |
| `CORS_ORIGINS` | Origines autorisées | ex: `https://inventaire.mairie.fr` |

```bash
# 2. Monter le NAS
sudo mkdir -p /mnt/mairie-backups
# Ajouter l'entrée dans /etc/fstab (CIFS)
sudo mount -a

# 3. Créer le fichier htpasswd pour Loki
sudo apt-get install -y apache2-utils
htpasswd -nbB mairie '<mot-de-passe>' > loki-proxy/htpasswd
chmod 600 loki-proxy/htpasswd

# 4. S'authentifier sur GHCR (si images privées)
echo "$GHCR_TOKEN" | docker login ghcr.io -u samyachd --password-stdin

# 5. Démarrer la stack
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Appliquer les migrations
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec backend alembic upgrade head

# 7. Configurer Apache + TLS
sudo cp deploy/apache/mairie.conf /etc/apache2/sites-available/mairie.conf
# Remplacer "inventaire.mairie.example.fr" par le vrai domaine dans le fichier
sudo a2enmod ssl proxy proxy_http headers rewrite remoteip
sudo a2ensite mairie
sudo apache2ctl configtest
sudo systemctl reload apache2
sudo certbot --apache -d <votre-domaine>
```

## Mise à jour

```bash
cd /home/<user>/mairie
git pull
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml up -d

# Si la release inclut des nouvelles migrations :
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  exec backend alembic upgrade head
```

## Opérations courantes

### Suivre les logs

```bash
COMPOSE="docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE logs -f backend
$COMPOSE logs -f --since 10m
```

### Statut des services

```bash
$COMPOSE ps
$COMPOSE ps --status unhealthy
```

### Shell psql

```bash
$COMPOSE exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### Forcer une sauvegarde immédiate

```bash
$COMPOSE exec db-backup /backup.sh
```

## Checklist de sécurité

| Action | Fréquence | Procédure |
|---|---|---|
| Rotation `SECRET_KEY` | Annuelle | Modifier `backend/.env.prod`, redémarrer le backend. **Les JWT existants seront invalidés.** |
| Rotation `POSTGRES_PASSWORD` | Annuelle | Modifier `.env.prod`, exécuter `ALTER USER ... WITH PASSWORD ...`, redémarrer db + backend. |
| Rotation `MISTRAL_API_KEY` | En cas de fuite | Dashboard Mistral, modifier `backend/.env.prod`, redémarrer le backend. |
| Renouvellement TLS | Automatique | Vérifier : `sudo systemctl status certbot.timer` |
| Test de restauration | Mensuelle | Voir [Restauration](restore.md) |
| Mise à jour des images base | Mensuelle | `docker compose pull && docker compose up -d` |

## Observabilité (accès)

Grafana n'est pas exposé publiquement. Deux méthodes d'accès :

**Tunnel SSH :**
```bash
ssh -L 3000:localhost:3001 user@host
# Ouvrir http://localhost:3000 dans le navigateur
```

**Subpath Apache avec basic auth :** ajouter un bloc `<Location /grafana>` dans `mairie.conf`.

### Configuration initiale de Grafana

1. Se connecter : `admin` / `${GRAFANA_ADMIN_PASSWORD}`
2. Ajouter la source **Loki** : URL `http://loki-proxy:3100`, Basic Auth activé, identifiants depuis `LOKI_BASIC_AUTH`
3. Ajouter la source **Prometheus** : URL `http://prometheus:9090`
4. Les logs sont labellisés `{service="backend"}`, `{service="frontend"}`, etc.

## Dépannage

### Backend `unhealthy` après déploiement

```bash
$COMPOSE logs --tail 200 backend
```

Causes fréquentes :
- Variable d'environnement manquante (erreur Pydantic au démarrage)
- PostgreSQL pas encore prêt (vérifier `POSTGRES_HOST=db`)
- Migration non appliquée (à faire manuellement)

### 502 depuis Apache

```bash
sudo tail -f /var/log/apache2/mairie_error.log
curl -i http://127.0.0.1:80/   # le conteneur frontend répond-il ?
```

### `docker compose pull` échoue avec 401

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u samyachd --password-stdin
```
