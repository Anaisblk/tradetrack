from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.product import Product
from app.models.quote import Quote, QuoteItem
from app.schemas.quote import QuoteCreate, QuoteUpdate


QUOTE_SORT_FIELDS = {
    "id": Quote.id,
    "total_ttc": Quote.total_ttc,
    "status": Quote.status,
    "valid_until": Quote.valid_until,
    "created_at": Quote.created_at,
}


async def get_quote(db: AsyncSession, quote_id: int) -> Quote | None:
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
        .options(selectinload(Quote.items))
        .options(selectinload(Quote.client))
    )
    return result.scalar_one_or_none()


async def list_quotes(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Quote]:
    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.client))
        .options(selectinload(Quote.items))
        .order_by(Quote.created_at.desc())
        .offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def list_quotes_paginated(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
) -> tuple[list[Quote], int]:
    needs_client_join = bool(search)
    count_q = select(func.count(Quote.id))
    if needs_client_join:
        count_q = count_q.outerjoin(Client, Quote.client_id == Client.id)
    if search:
        pattern = f"%{search}%"
        count_q = count_q.where(
            or_(Client.first_name.ilike(pattern), Client.last_name.ilike(pattern))
        )
    total = (await db.execute(count_q)).scalar_one()
    q = (
        select(Quote)
        .options(selectinload(Quote.client))
        .options(selectinload(Quote.items))
    )
    if needs_client_join:
        q = q.outerjoin(Client, Quote.client_id == Client.id)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            or_(Client.first_name.ilike(pattern), Client.last_name.ilike(pattern))
        )

    sort_col = QUOTE_SORT_FIELDS.get(order_by) if order_by else None
    if sort_col is not None:
        q = q.order_by(sort_col.desc() if order_dir == "desc" else sort_col.asc())
    else:
        q = q.order_by(Quote.created_at.desc())

    items = (await db.execute(q.offset(skip).limit(limit))).scalars().all()
    return list(items), total


async def _compute_item_amounts(db: AsyncSession, item) -> tuple[float, float, float, float, float]:
    """New item or free line: VAT is extracted from the price.
    Second-hand item: VAT applies to the margin only (sale price - purchase price)."""
    qty = item.quantity
    unit_ttc = float(item.unit_price_ht)

    product = None
    if item.product_id:
        result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = result.scalar_one_or_none()

    if product and product.condition == "occasion":
        subtotal_ttc = round(qty * unit_ttc, 2)
        purchase_ttc = round(qty * float(product.purchase_price), 2)
        margin = max(0.0, subtotal_ttc - purchase_ttc)
        subtotal_tva = round(margin * 20.0 / 120.0, 2)
        subtotal_ht = round(subtotal_ttc - subtotal_tva, 2)
        unit_ht_stored = round(subtotal_ht / qty, 2) if qty else 0.0
        return subtotal_ht, subtotal_tva, subtotal_ttc, unit_ht_stored, 20.0

    # New item or free line: price is incl. VAT, so VAT is extracted from it
    tva_rate = float(item.tva_rate)
    subtotal_ttc = round(qty * unit_ttc, 2)
    subtotal_tva = round(subtotal_ttc * tva_rate / (100 + tva_rate), 2)
    subtotal_ht = round(subtotal_ttc - subtotal_tva, 2)
    unit_ht_stored = round(unit_ttc / (1 + tva_rate / 100), 2) if (1 + tva_rate / 100) else 0.0
    return subtotal_ht, subtotal_tva, subtotal_ttc, unit_ht_stored, tva_rate


async def _persist_items(db: AsyncSession, quote: Quote, items_data: list) -> tuple[float, float, float]:
    total_ht = 0.0
    total_tva = 0.0
    total_ttc = 0.0
    for item_data in items_data:
        ht, tva, ttc, unit_ht_stored, tva_rate_stored = await _compute_item_amounts(db, item_data)
        qi = QuoteItem(
            quote_id=quote.id,
            product_id=item_data.product_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price_ht=unit_ht_stored,
            tva_rate=tva_rate_stored,
            subtotal_ttc=ttc,
        )
        db.add(qi)
        total_ht += ht
        total_tva += tva
        total_ttc += ttc
    return round(total_ht, 2), round(total_tva, 2), round(total_ttc, 2)


async def create_quote(db: AsyncSession, data: QuoteCreate, created_by_id: int) -> Quote:
    # Quotes are valid 30 days by default
    valid_until = data.valid_until
    if valid_until is None:
        valid_until = date.today() + timedelta(days=30)

    quote = Quote(
        client_id=data.client_id,
        created_by_id=created_by_id,
        total_ht=0.0,
        tva_amount=0.0,
        total_ttc=0.0,
        notes=data.notes,
        valid_until=valid_until,
        status="brouillon",
    )
    db.add(quote)
    await db.flush()

    total_ht, tva_amount, total_ttc = await _persist_items(db, quote, data.items)
    quote.total_ht = total_ht
    quote.tva_amount = tva_amount
    quote.total_ttc = total_ttc

    await db.flush()
    return await get_quote(db, quote.id)


async def update_quote(db: AsyncSession, quote: Quote, data: QuoteUpdate) -> Quote:
    simple = ["client_id", "notes", "valid_until", "status"]
    for field in simple:
        value = getattr(data, field)
        if value is not None:
            setattr(quote, field, value)

    if data.items is not None:
        for old in list(quote.items):
            await db.delete(old)
        await db.flush()
        total_ht, tva_amount, total_ttc = await _persist_items(db, quote, data.items)
        quote.total_ht = total_ht
        quote.tva_amount = tva_amount
        quote.total_ttc = total_ttc

    await db.flush()
    return await get_quote(db, quote.id)
