"""End-to-end flow: login → use token → create agent → read inventaire."""


class TestAPIFlow:
    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data

    def test_login_then_use_token(self, client, admin_user):
        # Login via the actual /auth/login endpoint
        login = client.post(
            "/auth/login",
            json={"email": admin_user.email, "password": "test-password"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]

        # Use the returned token to hit a protected route
        inv = client.get(
            "/inventaire/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert inv.status_code == 200

    def test_create_then_list_agent(self, admin_client):
        created = admin_client.post(
            "/agents/",
            json={"nom": "Flow Agent", "email": "flow@mairie.fr"},
        )
        assert created.status_code == 201
        agent_id = created.json()["id"]

        listing = admin_client.get("/inventaire/")
        assert listing.status_code == 200
        ids = [a["id"] for a in listing.json()["agents"]]
        assert agent_id in ids
