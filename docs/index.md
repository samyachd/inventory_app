# Mairie — Système d'Inventaire

Système de gestion d'inventaire informatique pour la mairie : ordinateurs, écrans, licences Office, agents et documents.

## Fonctionnalités

| Domaine | Description |
|---|---|
| **Agents** | Gestion du personnel (employés de la mairie) |
| **Ordinateurs** | Suivi des PC : propriétaire, réseau, matériel, garantie |
| **Écrans** | Inventaire des moniteurs associés aux postes |
| **Licences** | Suivi des licences Office et leur affectation |
| **Documents** | Gestion documentaire liée aux équipements |
| **QR Codes** | Génération de QR codes pour l'étiquetage physique |
| **OCR / IA** | Extraction automatique depuis des fichiers Excel via Mistral |
| **Observabilité** | Métriques Prometheus, logs Loki, dashboards Grafana |

## Stack technique

- **Backend** : FastAPI 0.128+ · Python 3.12+
- **Base de données** : PostgreSQL 15 + SQLAlchemy 2.0 + Alembic
- **Validation** : Pydantic 2.12+
- **Frontend** : React 19 (Vite)
- **Conteneurisation** : Docker Compose
- **Observabilité** : Prometheus · Loki · Promtail · Grafana
- **IA / OCR** : Mistral AI (`mistral-ocr-latest`)

## Liens rapides

- [Démarrage rapide](getting-started.md)
- [Référence API — Authentification](api/auth.md)
- [Déploiement en production](deployment/production.md)
- Swagger UI (dev) : `http://localhost:8000/docs`
- ReDoc (dev) : `http://localhost:8000/redoc`
