"""Tests for /auth endpoints (signup, login, me, logout)."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID, USER_ID
from tests.fixtures.data import make_user, make_team


@pytest.mark.asyncio
class TestSignup:
    async def test_signup_success(self, client):
        team = make_team(id=TEAM_ID)
        user = make_user(id=USER_ID, email="new@test.com", team_id=TEAM_ID)

        with patch("alrt.routes.auth.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.auth.execute_insert_query", new_callable=AsyncMock) as mock_insert:
            mock_read.return_value = None  # No existing user
            mock_insert.side_effect = [team, user, None, None]  # team, user, email provider, slack provider

            resp = await client.post("/auth/signup", json={
                "email": "new@test.com",
                "password": "password123",
                "name": "New User",
                "team_name": "New Team",
            })
            assert resp.status_code == 201
            data = resp.json()
            assert "token" in data
            assert "team_id" in data

    async def test_signup_duplicate_email(self, client):
        with patch("alrt.routes.auth.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = make_user()  # Existing user found

            resp = await client.post("/auth/signup", json={
                "email": "existing@test.com",
                "password": "password123",
                "name": "User",
                "team_name": "Team",
            })
            assert resp.status_code == 409
            assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client):
        import bcrypt
        password = "password123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        user = make_user(id=USER_ID, team_id=TEAM_ID, password_hash=hashed, is_active=True)

        with patch("alrt.routes.auth.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.auth.execute_update_query", new_callable=AsyncMock) as mock_update:
            mock_read.return_value = user
            mock_update.return_value = True

            resp = await client.post("/auth/login", json={
                "email": user["email"],
                "password": password,
            })
            assert resp.status_code == 200
            assert "token" in resp.json()

    async def test_login_wrong_password(self, client):
        import bcrypt
        hashed = bcrypt.hashpw(b"correct", bcrypt.gensalt()).decode()
        user = make_user(password_hash=hashed)

        with patch("alrt.routes.auth.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = user

            resp = await client.post("/auth/login", json={
                "email": user["email"],
                "password": "wrong",
            })
            assert resp.status_code == 401

    async def test_login_nonexistent_email(self, client):
        with patch("alrt.routes.auth.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = None

            resp = await client.post("/auth/login", json={
                "email": "nobody@test.com",
                "password": "password",
            })
            assert resp.status_code == 401


@pytest.mark.asyncio
class TestMe:
    async def test_get_me_returns_current_user(self, client):
        resp = await client.get("/auth/me", headers={"Authorization": "Bearer fake-jwt"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert data["role"] == "admin"


@pytest.mark.asyncio
class TestLogout:
    async def test_logout_clears_cookie(self, client):
        resp = await client.post("/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
