# 📦 Mairie - Système d'Inventaire

Système de gestion d'inventaire pour les équipements informatiques (ordinateurs, écrans, licences) d'une mairie.

## 🎯 Fonctionnalités

- **Gestion des Agents** : Suivi du personnel de la mairie et de leur matériel
- **Gestion des Ordinateurs** : Suivi complet des PC avec propriétaires, configurations, garanties
- **Gestion des Écrans** : Inventaire des moniteurs avec références aux ordinateurs
- **Gestion des Licences** : Suivi des licences Office avec associations aux PC
- **API RESTful** : FastAPI avec documentation automatique (Swagger)
- **Base de Données** : PostgreSQL avec SQLAlchemy ORM et migrations Alembic
- **Tests** : Suite de tests unitaires et d'intégration avec pytest

## 🛠️ Stack Technique

- **Backend** : FastAPI 0.128+
- **Base de Données** : PostgreSQL 16 + SQLAlchemy 2.0
- **Migrations** : Alembic 1.17+
- **Validation** : Pydantic 2.12+
- **Tests** : pytest 9.0+
- **Linting** : ruff 0.14+
- **Typing** : mypy 1.19+
- **Frontend** : React 19 (Vite)

## 📋 Prérequis

- Python 3.12+
- PostgreSQL 16
- pip ou uv (gestionnaire de paquets)

## ⚙️ Installation

### 1. Cloner le projet
```bash
git clone https://github.com/samyachd/mairie.git
cd mairie
```

### 2. Créer un environnement virtuel
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou
.venv\Scripts\activate     # Windows
```

### 3. Installer les dépendances
```bash
pip install -e .
# ou
uv sync
```

### 4. Configurer les variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos informations PostgreSQL
```

### 5. Créer la base de données
```bash
createdb mairie_db
```

### 6. Appliquer les migrations
```bash
alembic upgrade head
```

## 🚀 Démarrage

### Lancer le serveur
```bash
uvicorn backend.main:app --reload
```

L'API sera disponible sur `http://localhost:8000`

### Documentation Interactive
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

## 📚 Structure du Projet

```
mairie/
├── backend/
│   ├── main.py                  # Application FastAPI
│   ├── api/
│   │   └── routes/              # Routes API (agents, ordinateurs, etc)
│   ├── db/
│   │   ├── models/              # Modèles SQLAlchemy
│   │   └── session.py           # Configuration DB
│   ├── core/
│   │   ├── settings.py          # Configuration
│   │   ├── security.py          # Authentification/Sécurité
│   │   └── dependencies.py      # Dépendances FastAPI (rôles, JWT)
│   ├── schemas/                 # Schémas Pydantic
│   ├── services/                # Logique métier (OCR, QR code)
│   ├── alembic/                 # Migrations DB
│   └── tests/                   # Suite de tests pytest
├── frontend/                    # Application React (Vite)
├── notebooks/                   # Jupyter notebooks (RAG/CAG)
├── pyproject.toml               # Dépendances Python
└── .env.example                 # Variables d'env exemple
```

## 🧪 Tests

### Lancer tous les tests
```bash
pytest
```

### Lancer avec couverture de code
```bash
pytest --cov=backend tests/
```

### Mode verbose
```bash
pytest -v
```

### Tests spécifiques
```bash
pytest tests/unit/api/test_users.py -v
pytest tests/integration/ -v
```

## 📝 Endpoints API

### Inventaire (lecture)
- `GET /inventaire/` - Retourne l'ensemble de l'inventaire (agents, ordinateurs, écrans, licences, documents)

### Agents
- `POST /agents/` - Créer un agent
- `PUT /agents/{id}` - Mettre à jour un agent
- `DELETE /agents/{id}` - Supprimer un agent

### Ordinateurs
- `POST /ordinateurs/` - Créer un ordinateur
- `PUT /ordinateurs/{id}` - Mettre à jour un ordinateur
- `DELETE /ordinateurs/{id}` - Supprimer un ordinateur

### Écrans
- `POST /ecrans/` - Créer un écran
- `PUT /ecrans/{id}` - Mettre à jour un écran
- `DELETE /ecrans/{id}` - Supprimer un écran

### Licences
- `POST /licenses/` - Créer une licence
- `PUT /licenses/{id}` - Mettre à jour une licence
- `DELETE /licenses/{id}` - Supprimer une licence

### Authentification
- `POST /auth/login` - Obtenir un token JWT
- `POST /auth/logout` - Révoquer le token

### Autres
- `GET /users/` · `POST /users/` · … - Gestion des comptes utilisateurs (app)
- `GET /qrcode/{tag}` - Générer un QR code
- `POST /models/ocr` - Extraction OCR via Mistral

## 🔐 Sécurité

### Fonctionnalités de sécurité
- Authentification JWT (HS256) avec expiration configurable
- Système de rôles : `admin` > `user` > `read`
- Blacklist de tokens révoqués
- CORS configuré pour les origines autorisées
- Validation des entrées avec Pydantic
- Audit trail des modifications (`action_log`)

## 📊 Modèles de Données

### Agent
```python
- id: int (PK)
- nom: str
- email: str (unique, optionnel)
- telephone: str (optionnel)
- clef_wifi: bool (optionnel)
- casque: bool (optionnel)
- created_at: datetime
- updated_at: datetime
```

### Ordinateur
```python
- id: int (PK)
- tag: str (unique)
- marque: str
- modele: str
- type_pc: str
- ram: str
- os: str
- nom_reseau: str (unique)
- ip_address: str (unique)
- agent_id: int (FK → Agent, optionnel)
- office_license_id: int (FK → OfficeLicence, optionnel)
```

### Ecran
```python
- id: int (PK)
- tag: str (unique)
- taille: str
- marque: str
- modele: str
- ordinateur_id: int (FK → Ordinateur, optionnel)
- slot: int (1-5)
```

### OfficeLicence
```python
- id: int (PK)
- version: str
- type_license: str
- numero_bc: str
- achat: date
- fin_garantie: date
```

## 🔄 Migrations

### Créer une migration
```bash
alembic revision --autogenerate -m "description"
```

### Appliquer les migrations
```bash
alembic upgrade head
```

### Revenir en arrière
```bash
alembic downgrade -1
```

### Voir l'historique
```bash
alembic history
```

## 🐛 Dépannage

### Erreur de connexion DB
```bash
# Vérifier les variables d'env
cat .env

# Tester la connexion PostgreSQL
psql -U [DB_USER] -h [DB_HOST] -d [DB_NAME]
```

### Erreur de migration
```bash
# Réinitialiser la migration
alembic stamp head
alembic revision --autogenerate -m "new migration"
```

### Tests qui échouent
```bash
# Vérifier que pytest est installé
pip install pytest pytest-cov

# Nettoyer le cache
rm -rf .pytest_cache __pycache__

# Relancer les tests
pytest -v
```

## 📖 Développement

### Ajouter une nouvelle route
1. Créer le fichier dans `backend/api/routes/`
2. Définir le Pydantic schema dans `backend/schemas/`
3. Importer et inclure le router dans `backend/main.py`
4. Ajouter les tests dans `backend/tests/`

### Code standards
- Utiliser logging pour les opérations
- Lever des `HTTPException` pour les erreurs
- Valider avec Pydantic
- Tester unitairement chaque fonction

### Linting & Formatage
```bash
# Linter avec ruff
ruff check backend/

# Formatter avec ruff
ruff format backend/

# Type checking avec mypy
mypy backend/
```

## 📞 Support

Pour les questions ou bugs :
1. Vérifier la [documentation FastAPI](https://fastapi.tiangolo.com/)
2. Consulter les tests existants
3. Créer une issue sur GitHub

## 📄 License

ISC

## 🤝 Contribuer

Les contributions sont bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/new-feature`)
3. Commiter les changements (`git commit -m 'Add feature'`)
4. Pousser vers la branche (`git push origin feature/new-feature`)
5. Ouvrir une Pull Request

---

**Version** : 0.2.0  
**Dernier update** : Mai 2026
