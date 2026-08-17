from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_technicien_or_above
from app.db.session import get_db
from app.models.user import User
from app.schemas.pagination import PaginatedRepairs
from app.schemas.repair import RepairCreate, RepairResponse, RepairUpdate
from app.services import repair_service

router = APIRouter(prefix="/repairs", tags=["Repairs"])


@router.get("/", response_model=list[RepairResponse])
async def list_repairs(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_technicien_or_above),
):
    return await repair_service.list_repairs(db, skip, limit, search)


@router.post("/", response_model=RepairResponse, status_code=201)
async def create_repair(
    data: RepairCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_technicien_or_above),
):
    repair = await repair_service.create_repair(db, data, current_user.id)
    await db.commit()
    return repair


@router.get("/paginated", response_model=PaginatedRepairs)
async def list_repairs_paginated(
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_technicien_or_above),
):
    items, total = await repair_service.list_repairs_paginated(
        db, skip, limit, search, order_by, order_dir
    )
    return {"items": items, "total": total}


@router.get("/{repair_id}", response_model=RepairResponse)
async def get_repair(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_technicien_or_above),
):
    repair = await repair_service.get_repair(db, repair_id)
    if not repair:
        raise HTTPException(404, "Réparation introuvable")
    return repair


@router.put("/{repair_id}", response_model=RepairResponse)
async def update_repair(
    repair_id: int, data: RepairUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_technicien_or_above),
):
    repair = await repair_service.get_repair(db, repair_id)
    if not repair:
        raise HTTPException(404, "Réparation introuvable")
    repair = await repair_service.update_repair(db, repair, data, current_user.id)
    await db.commit()
    return repair


@router.put("/{repair_id}/status", response_model=RepairResponse)
async def update_status(
    repair_id: int, status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_technicien_or_above),
):
    repair = await repair_service.get_repair(db, repair_id)
    if not repair:
        raise HTTPException(404, "Réparation introuvable")
    repair = await repair_service.update_repair(db, repair, RepairUpdate(status=status), current_user.id)
    await db.commit()
    return repair
