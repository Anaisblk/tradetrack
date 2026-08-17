from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("/", response_model=list[AppointmentResponse])
async def list_appointments(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await appointment_service.list_appointments(db, skip, limit)


@router.post("/", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    apt = await appointment_service.create_appointment(db, data, current_user.id)
    await db.commit()
    return apt


@router.put("/{apt_id}", response_model=AppointmentResponse)
async def update_appointment(
    apt_id: int, data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    apt = await appointment_service.get_appointment(db, apt_id)
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")
    apt = await appointment_service.update_appointment(db, apt, data)
    await db.commit()
    return apt


@router.delete("/{apt_id}", status_code=204)
async def delete_appointment(
    apt_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    apt = await appointment_service.get_appointment(db, apt_id)
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")
    await appointment_service.delete_appointment(db, apt)
    await db.commit()
