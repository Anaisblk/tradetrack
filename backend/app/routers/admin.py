from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services import client_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/deletion-requests", response_model=list[UserResponse])
async def list_deletion_requests(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """RGPD — liste les utilisateurs ayant soumis une demande de suppression,
    les plus anciennes en premier (à traiter sous 14 jours)."""
    result = await db.execute(
        select(User)
        .where(User.deletion_requested_at.isnot(None))
        .order_by(User.deletion_requested_at.asc())
    )
    return list(result.scalars().all())


@router.post("/deletion-requests/{user_id}/approve", status_code=200)
async def approve_deletion_request(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """RGPD — approuve une demande : anonymise l'utilisateur et son dossier client."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if user.deletion_requested_at is None:
        raise HTTPException(400, "Aucune demande de suppression en cours pour cet utilisateur")
    client = await client_service.get_client_by_user_id(db, user.id)
    if not client:
        raise HTTPException(404, "Aucun dossier client associé à cet utilisateur")
    await client_service.anonymize_client(db, client, user)
    await db.commit()
    return {"message": "Utilisateur anonymisé avec succès"}
