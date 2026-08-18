import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.db.session import get_db, AsyncSessionLocal
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services import notification_service
from app.services.user_service import get_user_by_id

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await notification_service.list_notifications(db, current_user.id, unread_only)


@router.put("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = await notification_service.mark_read(db, notif_id, current_user.id)
    await db.commit()
    return notif


@router.put("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await notification_service.mark_all_read(db, current_user.id)
    await db.commit()


@router.get("/stream")
async def notification_stream(token: str = Query(...)):
    # EventSource cannot send custom headers, so the token goes in the query string
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalide")

    async with AsyncSessionLocal() as db:
        user = await get_user_by_id(db, int(user_id))
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    from app.services.notification_service import _redis_client

    async def event_generator():
        if not _redis_client:
            yield "data: {}\n\n"
            while True:
                await asyncio.sleep(30)
                yield ": keepalive\n\n"

        pubsub = _redis_client.pubsub()
        channel = f"notifications:{user.id}"
        try:
            await pubsub.subscribe(channel)
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=25)
                if message and message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
                else:
                    yield ": keepalive\n\n"
                await asyncio.sleep(0.1)
        except Exception:
            pass
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except Exception:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
