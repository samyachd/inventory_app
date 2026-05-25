"""Auth flow: login, role checks, token rejection."""


def test_login_success(client, admin_user):
    """Valid credentials → 200 + access_token."""
    response = client.post(
        "/auth/login",
        json={"email": admin_user.email, "password": "test-password"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, admin_user):
    response = client.post(
        "/auth/login",
        json={"email": admin_user.email, "password": "definitely-wrong"},
    )
    assert response.status_code == 401


def test_login_unknown_email(client):
    response = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


def test_protected_endpoint_requires_auth(client):
    """Inventaire is auth-gated; no Bearer → 401/403."""
    response = client.get("/inventaire/")
    assert response.status_code in (401, 403)


def test_invalid_token_rejected(client):
    response = client.get(
        "/inventaire/",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401
