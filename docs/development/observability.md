# Observabilité

La stack d'observabilité tourne dans Docker Compose et couvre les métriques, les logs et les dashboards.

## Composants

| Service | Port (dev) | Rôle |
|---|---|---|
| **Prometheus** | `9090` | Collecte des métriques depuis le backend |
| **Promtail** | — | Collecte les logs Docker et les envoie à Loki |
| **Loki** | — | Agrégation des logs (interne) |
| **loki-proxy** | — | Proxy nginx avec basic auth devant Loki |
| **Grafana** | `3001` | Dashboards (métriques + logs) |

## Métriques

Le backend expose ses métriques Prometheus via `prometheus-fastapi-instrumentator` :

```
GET /metrics
```

Métriques disponibles :
- Requêtes HTTP (count, durée, statuts) par route
- Métriques système Python standard

Config Prometheus : `prometheus.yml` (dev) / `prometheus.prod.yml` (prod) à la racine du projet.

## Logs

Promtail collecte les logs de sortie standard de chaque conteneur Docker.  
Les logs sont labellisés par service :

```
{service="backend"}
{service="frontend"}
```

Config Promtail : `promtail.yml` (dev) / `promtail.prod.yml` (prod) à la racine du projet.

## Accès en développement

| Interface | URL |
|---|---|
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

Identifiants Grafana par défaut : `admin` / `${GRAFANA_ADMIN_PASSWORD}` (voir `.env`).

## Configuration des sources de données Grafana

### Loki

- URL : `http://loki-proxy:3100`
- Basic Auth : activé, identifiants depuis `LOKI_BASIC_AUTH` dans `.env`

### Prometheus

- URL : `http://prometheus:9090`
- Pas d'authentification

## Accès en production

Grafana n'est pas exposé publiquement. Voir [Déploiement — Observabilité](../deployment/production.md#observabilite-acces).

## Stats OCR

Les extractions OCR sont tracées dans la table `ocr_stats` et consultables via :

```
GET /logs/ocr
```

Champs suivis : durée, type de document, taille du fichier, succès/échec.
