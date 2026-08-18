from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.product import Product
from app.models.repair import Repair, RepairItem
from app.schemas.repair import RepairCreate, RepairUpdate
from app.services import stock_service


REPAIR_SORT_FIELDS = {
    "id": Repair.id,
    "status": Repair.status,
    "estimated_date": Repair.estimated_date,
    "created_at": Repair.created_at,
}

TVA_REPAIR = 20.0


async def get_repair(db: AsyncSession, repair_id: int) -> Repair | None:
    result = await db.execute(
        select(Repair).where(Repair.id == repair_id)
        .options(selectinload(Repair.items).selectinload(RepairItem.product))
        .options(selectinload(Repair.client))
    )
    return result.scalar_one_or_none()


async def list_repairs(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> list[Repair]:
    q = (
        select(Repair)
        .options(selectinload(Repair.client))
        .options(selectinload(Repair.items))
        .order_by(Repair.created_at.desc())
    )
    if search:
        pattern = f"%{search}%"
        q = q.outerjoin(Repair.client).where(
            or_(
                Client.first_name.ilike(pattern),
                Client.last_name.ilike(pattern),
            )
        )
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def list_repairs_paginated(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
) -> tuple[list[Repair], int]:
    needs_client_join = bool(search)
    count_q = select(func.count(Repair.id))
    if needs_client_join:
        count_q = count_q.outerjoin(Client, Repair.client_id == Client.id)
    if search:
        pattern = f"%{search}%"
        count_q = count_q.where(
            or_(Client.first_name.ilike(pattern), Client.last_name.ilike(pattern))
        )
    total = (await db.execute(count_q)).scalar_one()
    q = (
        select(Repair)
        .options(selectinload(Repair.client))
        .options(selectinload(Repair.items))
    )
    if needs_client_join:
        q = q.outerjoin(Client, Repair.client_id == Client.id)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            or_(Client.first_name.ilike(pattern), Client.last_name.ilike(pattern))
        )

    sort_col = REPAIR_SORT_FIELDS.get(order_by) if order_by else None
    if sort_col is not None:
        q = q.order_by(sort_col.desc() if order_dir == "desc" else sort_col.asc())
    else:
        q = q.order_by(Repair.created_at.desc())

    items = (await db.execute(q.offset(skip).limit(limit))).scalars().all()
    return list(items), total


async def create_repair(db: AsyncSession, data: RepairCreate, created_by_id: int) -> Repair:
    repair = Repair(
        client_id=data.client_id,
        technicien_id=data.technicien_id,
        device_type=data.device_type,
        device_brand=data.device_brand,
        device_model=data.device_model,
        serial_number=data.serial_number,
        problem_description=data.problem_description,
        deposit_amount=data.deposit_amount,
        estimated_cost=data.estimated_cost,
        payment_method=data.payment_method,
        estimated_date=data.estimated_date,
        notes=data.notes,
        status="recu",
    )
    db.add(repair)
    await db.flush()
    return await get_repair(db, repair.id)


async def update_repair(db: AsyncSession, repair: Repair, data: RepairUpdate, current_user_id: int) -> Repair:
    simple_fields = ["technicien_id", "diagnosis", "status", "deposit_amount",
                     "estimated_cost", "payment_method", "estimated_date", "completed_date", "notes"]
    for field in simple_fields:
        value = getattr(data, field)
        if value is not None:
            setattr(repair, field, value)

    if data.repair_cost_ht is not None:
        repair.repair_cost_ht = data.repair_cost_ht
        tva = round(data.repair_cost_ht * TVA_REPAIR / 100, 2)
        repair.tva_amount = tva
        repair.repair_cost_ttc = round(data.repair_cost_ht + tva, 2)

    if data.items is not None:
        for old_item in list(repair.items):
            await db.delete(old_item)
        await db.flush()

        for item_data in data.items:
            result = await db.execute(
                select(Product).where(Product.id == item_data.product_id).with_for_update()
            )
            product = result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail=f"Produit {item_data.product_id} introuvable")
            if product.stock_quantity < item_data.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuffisant pour {product.name}")

            qty = item_data.quantity
            # All prices are entered incl. VAT
            unit_ttc = float(item_data.unit_price_ht) if item_data.unit_price_ht else float(product.selling_price)

            if product.condition == "occasion":
                # VAT on margin for second-hand parts
                subtotal_ttc = round(qty * unit_ttc, 2)
                purchase_ttc = round(qty * float(product.purchase_price), 2)
                margin = max(0.0, subtotal_ttc - purchase_ttc)
                subtotal_tva = round(margin * 20.0 / 120.0, 2)
                subtotal_ht = round(subtotal_ttc - subtotal_tva, 2)
                unit_ht_stored = round(subtotal_ht / qty, 2) if qty else 0.0
            else:
                # New part: VAT extracted from the price
                subtotal_ttc = round(qty * unit_ttc, 2)
                unit_ht_stored = round(unit_ttc / 1.20, 2)

            ri = RepairItem(
                repair_id=repair.id,
                product_id=product.id,
                quantity=qty,
                unit_price_ht=unit_ht_stored,
                subtotal_ttc=subtotal_ttc,
            )
            db.add(ri)
            product.stock_quantity -= item_data.quantity
            await db.flush()
            await stock_service.record_movement(
                db, product.id, "reparation", -item_data.quantity,
                f"Réparation #{repair.id}", current_user_id
            )

    await db.flush()
    return await get_repair(db, repair.id)
