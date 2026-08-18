from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_vendeur_or_admin
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.schemas.pagination import PaginatedClients
from app.schemas.user import PasswordChange, UserResponse
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    skip: int = 0, limit: int = 100, search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await client_service.list_clients(db, skip, limit, search)


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_vendeur_or_admin),
):
    client = await client_service.create_client(db, data, current_user.id)
    await db.commit()
    return client


@router.get("/paginated", response_model=PaginatedClients)
async def list_clients_paginated(
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    items, total = await client_service.list_clients_paginated(
        db, skip, limit, search, order_by, order_dir
    )
    return {"items": items, "total": total}


@router.get("/me/export")
async def export_my_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GDPR right to data portability (art. 20) — PDF export."""
    client = await client_service.get_client_by_user_id(db, current_user.id)
    if not client:
        raise HTTPException(404, "Aucun dossier client associé à votre compte")

    # Blocked here too, not only in the UI, so no empty PDF can ever be generated
    counts = await client_service.get_client_data_counts(db, client.id)
    if counts["total"] == 0:
        raise HTTPException(409, "Aucune donnée à exporter pour le moment.")

    pdf_bytes = await client_service.export_client_data_pdf(db, client.id)
    filename = f"mes-donnees-tradetrack-{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Current user, including any pending GDPR deletion request."""
    return current_user


@router.get("/me/summary")
async def get_my_data_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tells the client portal whether there is anything to export."""
    client = await client_service.get_client_by_user_id(db, current_user.id)
    if not client:
        return {"repairs": 0, "quotes": 0, "appointments": 0, "total": 0, "has_data": False}
    counts = await client_service.get_client_data_counts(db, client.id)
    return {**counts, "has_data": counts["total"] > 0}


@router.post("/me/password", status_code=200)
async def change_my_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The current password is required, so an open session is not enough to take
    over the account. Also used to replace a temporary password set by the shop."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Mot de passe actuel incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(400, "Le nouveau mot de passe doit être différent de l'actuel")

    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Mot de passe modifié"}


@router.post("/me/request-deletion", status_code=200)
async def request_my_deletion(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GDPR right to erasure (art. 17). The client sends a request; an admin
    triggers the actual anonymisation later (14 days max)."""
    if current_user.deletion_requested_at is not None:
        raise HTTPException(400, "Une demande de suppression est déjà en cours")
    current_user.deletion_requested_at = datetime.now(timezone.utc)
    await db.commit()
    return {
        "deletion_requested_at": current_user.deletion_requested_at.isoformat(),
        "message": "Demande enregistrée, elle sera traitée sous 14 jours.",
    }


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    client = await client_service.get_client(db, client_id)
    if not client:
        raise HTTPException(404, "Client introuvable")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int, data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    client = await client_service.get_client(db, client_id)
    if not client:
        raise HTTPException(404, "Client introuvable")
    client = await client_service.update_client(db, client, data)
    await db.commit()
    return client
