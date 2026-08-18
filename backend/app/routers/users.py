from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import ApprovalStatus, User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services import notification_service, user_service

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


@router.post("/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Approves a sign-up request so the client can log in."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if user.approval_status == ApprovalStatus.approved:
        raise HTTPException(400, "Ce compte est déjà validé")

    user.approval_status = ApprovalStatus.approved
    user.is_active = True
    await db.flush()

    await notification_service.create_notification(
        db,
        user_id=user.id,
        type="compte_valide",
        title="Compte validé",
        message="Votre compte a été validé, vous pouvez désormais vous connecter.",
    )
    await db.commit()
    return user


@router.post("/{user_id}/reject", response_model=UserResponse)
async def reject_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Rejects a request. The account is kept, so the decision can be reversed."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if user.approval_status != ApprovalStatus.pending:
        raise HTTPException(400, "Seule une demande en attente peut être refusée")

    user.approval_status = ApprovalStatus.rejected
    user.is_active = False
    await db.commit()
    return user
