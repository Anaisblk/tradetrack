from app.core.security import create_access_token


async def get_token(client, email: str, password: str) -> str:
    resp = await client.post("/api/auth/login", data={"username": email, "password": password})
    return resp.json()["access_token"]


async def create_test_user(client, email: str, password: str, role):
    from sqlalchemy import select
    from app.models.user import User
    from app.core.security import hash_password

    token = create_access_token({"sub": "1", "role": "admin"})
    return token
