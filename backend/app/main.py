import asyncio

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    admin,
    appointments,
    auth,
    clients,
    dashboard,
    notifications,
    products,
    quotes,
    repairs,
    users,
)
from app.services import notification_service

app = FastAPI(title="TradeTrack API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(clients.router, prefix=PREFIX)
app.include_router(products.router, prefix=PREFIX)
app.include_router(repairs.router, prefix=PREFIX)
app.include_router(quotes.router, prefix=PREFIX)
app.include_router(appointments.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)


@app.on_event("startup")
async def startup():
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        notification_service.set_redis_client(redis_client)
    except Exception:
        pass

    asyncio.create_task(_reminder_loop())


async def _reminder_loop():
    from app.db.session import AsyncSessionLocal
    from app.services.appointment_service import check_and_send_reminders

    while True:
        await asyncio.sleep(300)  # toutes les 5 minutes
        try:
            async with AsyncSessionLocal() as db:
                async with db.begin():
                    await check_and_send_reminders(db)
        except Exception:
            pass


@app.get("/api/health")
async def health():
    return {"status": "ok"}
