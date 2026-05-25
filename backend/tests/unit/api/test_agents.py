"""CRUD round-trip on /agents/ — covers the standard pattern used by other entities."""


def test_create_agent(admin_client):
    response = admin_client.post(
        "/agents/",
        json={"nom": "Jean Dupont", "email": "jean@mairie.fr"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["nom"] == "Jean Dupont"
    assert body["email"] == "jean@mairie.fr"
    assert "id" in body


def test_create_agent_missing_required_field(admin_client):
    response = admin_client.post("/agents/", json={})
    assert response.status_code == 422


def test_create_agent_duplicate_email(admin_client):
    payload = {"nom": "First", "email": "dup@mairie.fr"}
    first = admin_client.post("/agents/", json=payload)
    assert first.status_code == 201

    second = admin_client.post(
        "/agents/", json={"nom": "Second", "email": "dup@mairie.fr"}
    )
    assert second.status_code == 409


def test_update_agent(admin_client):
    created = admin_client.post(
        "/agents/", json={"nom": "Avant", "email": "upd@mairie.fr"}
    ).json()
    response = admin_client.put(
        f"/agents/{created['id']}", json={"nom": "Après"}
    )
    assert response.status_code == 200
    assert response.json()["nom"] == "Après"


def test_update_agent_missing(admin_client):
    response = admin_client.put("/agents/999999", json={"nom": "ghost"})
    assert response.status_code == 404


def test_delete_agent(admin_client):
    created = admin_client.post(
        "/agents/", json={"nom": "À supprimer", "email": "del@mairie.fr"}
    ).json()
    response = admin_client.delete(f"/agents/{created['id']}")
    assert response.status_code == 204


def test_delete_agent_missing(admin_client):
    response = admin_client.delete("/agents/999999")
    assert response.status_code == 404


# ─── RBAC ─────────────────────────────────────────────────────────────────

def test_read_role_cannot_create_agent(read_client):
    response = read_client.post(
        "/agents/", json={"nom": "Read tries to write", "email": "x@mairie.fr"}
    )
    assert response.status_code == 403


def test_user_role_can_create_agent(user_client):
    response = user_client.post(
        "/agents/", json={"nom": "User writes", "email": "uw@mairie.fr"}
    )
    assert response.status_code == 201
