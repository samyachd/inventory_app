# Tests

Les tests sont écrits avec **pytest** et s'appuient sur `httpx` + `TestClient` de FastAPI.

## Lancer les tests

```bash
make test
# ou directement :
docker compose exec backend uv run pytest

# Avec couverture
docker compose exec backend uv run pytest --cov=backend

# Mode verbeux
docker compose exec backend uv run pytest -v

# Un fichier spécifique
docker compose exec backend uv run pytest tests/unit/api/test_users.py -v
```

## Structure

```
backend/tests/
├── conftest.py           # Engine, sessions, fixtures de clients HTTP
└── unit/
    └── api/              # Tests des routes API
```

## Base de données de test

Le `conftest.py` choisit automatiquement la base :

| Contexte | Base utilisée |
|---|---|
| Local (défaut) | SQLite en mémoire |
| CI (`CI=true`) ou `USE_POSTGRES_TESTS=true` | PostgreSQL (variables `POSTGRES_*`) |

Chaque test tourne dans une **transaction qui est rollbackée** à la fin — aucune donnée ne fuite entre les tests.

## Fixtures disponibles

| Fixture | Scope | Description |
|---|---|---|
| `db_engine` | session | Engine SQLAlchemy (créé une fois pour toute la session) |
| `db_session` | function | Session isolée avec rollback automatique |
| `client` | function | `TestClient` sans authentification |
| `admin_client` | function | `TestClient` avec token JWT admin |
| `user_client` | function | `TestClient` avec token JWT user |
| `test_admin_user` | function | Objet `User` admin en base |
| `test_user_user` | function | Objet `User` standard en base |

## Exemple de test

```python
def test_create_ordinateur(admin_client):
    response = admin_client.post("/ordinateurs/", json={
        "tag": "PC-TEST-001",
        "marque": "Dell",
        "service": "Test",
    })
    assert response.status_code == 201
    assert response.json()["tag"] == "PC-TEST-001"


def test_create_ordinateur_duplicate_tag(admin_client):
    data = {"tag": "PC-DUP", "marque": "HP"}
    admin_client.post("/ordinateurs/", json=data)
    response = admin_client.post("/ordinateurs/", json=data)
    assert response.status_code == 409
```

## Bonnes pratiques

- Les tests d'API vérifient le code HTTP **et** la structure de la réponse
- Utiliser `admin_client` / `user_client` pour tester les contrôles d'accès
- Nommer les tests `test_<action>_<contexte>` pour faciliter la lecture
- Ne pas mocker la base de données — utiliser la session de test (SQLite)
