from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_vendeur_or_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.pagination import PaginatedQuotes
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteUpdate
from app.services import quote_service

router = APIRouter(prefix="/quotes", tags=["Quotes"])


@router.get("/", response_model=list[QuoteResponse])
async def list_quotes(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await quote_service.list_quotes(db, skip, limit)


@router.post("/", response_model=QuoteResponse, status_code=201)
async def create_quote(
    data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_vendeur_or_admin),
):
    quote = await quote_service.create_quote(db, data, current_user.id)
    await db.commit()
    return quote


@router.get("/paginated", response_model=PaginatedQuotes)
async def list_quotes_paginated(
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    items, total = await quote_service.list_quotes_paginated(
        db, skip, limit, search, order_by, order_dir
    )
    return {"items": items, "total": total}


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    quote = await quote_service.get_quote(db, quote_id)
    if not quote:
        raise HTTPException(404, "Devis introuvable")
    return quote


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: int, data: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    quote = await quote_service.get_quote(db, quote_id)
    if not quote:
        raise HTTPException(404, "Devis introuvable")
    quote = await quote_service.update_quote(db, quote, data)
    await db.commit()
    return quote
