import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User",
        "role": "client",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "client"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    resp = await client.post("/api/auth/login", data={
        "username": "nonexistent@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@example.com", "password": "pass123", "first_name": "A", "last_name": "B", "role": "client"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
