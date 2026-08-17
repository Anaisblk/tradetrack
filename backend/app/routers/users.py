from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await user_service.list_users(db, skip, limit)


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await user_service.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(400, "Email déjà utilisé")
    user = await user_service.create_user(db, data)
    await db.commit()
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int, data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    user = await user_service.update_user(db, user, data)
    await db.commit()
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(400, "Impossible de supprimer son propre compte")
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    user.is_active = False
    await db.commit()
