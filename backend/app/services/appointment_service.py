from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.services import notification_service


async def get_appointment(db: AsyncSession, apt_id: int) -> Appointment | None:
    result = await db.execute(
        select(Appointment).where(Appointment.id == apt_id)
        .options(selectinload(Appointment.client))
    )
    return result.scalar_one_or_none()


async def list_appointments(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Appointment]:
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.client))
        .order_by(Appointment.start_datetime)
        .offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def create_appointment(db: AsyncSession, data: AppointmentCreate, created_by_id: int) -> Appointment:
    apt = Appointment(
        client_id=data.client_id,
        created_by_id=created_by_id,
        assigned_to_id=data.assigned_to_id,
        title=data.title,
        description=data.description,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        status=data.status,
    )
    db.add(apt)
    await db.flush()
    return await get_appointment(db, apt.id)


async def update_appointment(db: AsyncSession, apt: Appointment, data: AppointmentUpdate) -> Appointment:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(apt, field, value)
    await db.flush()
    return await get_appointment(db, apt.id)


async def delete_appointment(db: AsyncSession, apt: Appointment) -> None:
    await db.delete(apt)
    await db.flush()


async def check_and_send_reminders(db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)

    windows = [
        (now + timedelta(hours=22), now + timedelta(hours=26), "J-1"),
        (now + timedelta(hours=1, minutes=30), now + timedelta(hours=2, minutes=30), "H-2"),
    ]

    for window_start, window_end, label in windows:
        result = await db.execute(
            select(Appointment).where(
                Appointment.start_datetime >= window_start,
                Appointment.start_datetime <= window_end,
                Appointment.reminder_sent == False,
                Appointment.status.in_(["planifie", "confirme"]),
            ).options(selectinload(Appointment.client))
        )
        appointments = result.scalars().all()

        for apt in appointments:
            client_name = ""
            if apt.client:
                client_name = f" - {apt.client.first_name} {apt.client.last_name}"
            message = f"Rappel {label} : {apt.title}{client_name} le {apt.start_datetime.strftime('%d/%m/%Y à %H:%M')}"

            if apt.assigned_to_id:
                await notification_service.create_notification(
                    db,
                    user_id=apt.assigned_to_id,
                    type="appointment_reminder",
                    title=f"Rappel RDV {label}",
                    message=message,
                    related_object_id=apt.id,
                    related_object_type="appointment",
                )
            if apt.created_by_id != apt.assigned_to_id:
                await notification_service.create_notification(
                    db,
                    user_id=apt.created_by_id,
                    type="appointment_reminder",
                    title=f"Rappel RDV {label}",
                    message=message,
                    related_object_id=apt.id,
                    related_object_type="appointment",
                )

            apt.reminder_sent = True

        await db.flush()
