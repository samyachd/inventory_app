"""GET /inventaire/ returns the aggregate shape used by the frontend."""


def test_inventaire_empty(admin_client):
    response = admin_client.get("/inventaire/")
    assert response.status_code == 200
    body = response.json()
    # All 5 keys present, all empty in a fresh DB
    for key in ("agents", "ordinateurs", "ecrans", "licences", "documents"):
        assert key in body
        assert body[key] == []


def test_inventaire_returns_created_entities(admin_client):
    # Create one agent through the API so we exercise the full stack.
    create = admin_client.post(
        "/agents/", json={"nom": "Agent Smith", "email": "smith@mairie.fr"}
    )
    assert create.status_code == 201, create.text

    response = admin_client.get("/inventaire/")
    assert response.status_code == 200
    body = response.json()
    assert len(body["agents"]) == 1
    assert body["agents"][0]["nom"] == "Agent Smith"
