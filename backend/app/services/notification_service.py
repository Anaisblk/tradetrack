import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User, UserRole

_redis_client = None


def set_redis_client(client):
    global _redis_client
    _redis_client = client


async def create_notification(
    db: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_object_id: int | None = None,
    related_object_type: str | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_object_id=related_object_id,
        related_object_type=related_object_type,
    )
    db.add(notif)
    await db.flush()

    if _redis_client:
        try:
            await _redis_client.publish(
                f"notifications:{user_id}",
                json.dumps({"type": type, "title": title, "message": message}),
            )
        except Exception:
            pass

    return notif


async def create_for_admins(
    db: AsyncSession, type: str, title: str, message: str,
    related_object_id: int | None = None, related_object_type: str | None = None
) -> None:
    result = await db.execute(
        select(User).where(User.role == UserRole.admin, User.is_active == True)
    )
    admins = result.scalars().all()
    for admin in admins:
        await create_notification(db, admin.id, type, title, message, related_object_id, related_object_type)


async def list_notifications(db: AsyncSession, user_id: int, unread_only: bool = False) -> list[Notification]:
    q = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
    if unread_only:
        q = q.where(Notification.is_read == False)
    result = await db.execute(q.limit(50))
    return list(result.scalars().all())


async def mark_read(db: AsyncSession, notification_id: int, user_id: int) -> Notification | None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.flush()
    return notif


async def mark_all_read(db: AsyncSession, user_id: int) -> None:
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.flush()
