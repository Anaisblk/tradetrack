from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.product import Product, StockMovement
from app.schemas.product import StockMovementCreate
from app.services import notification_service


async def record_movement(
    db: AsyncSession,
    product_id: int,
    movement_type: str,
    quantity: int,
    reason: str | None,
    created_by_id: int | None,
) -> StockMovement:
    movement = StockMovement(
        product_id=product_id,
        movement_type=movement_type,
        quantity=quantity,
        reason=reason,
        created_by_id=created_by_id,
    )
    db.add(movement)
    await db.flush()

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product and product.stock_quantity < settings.STOCK_ALERT_THRESHOLD:
        await notification_service.create_for_admins(
            db,
            type="stock_alert",
            title=f"Stock bas : {product.name}",
            message=f"Quantité restante : {product.stock_quantity} (seuil : {settings.STOCK_ALERT_THRESHOLD})",
            related_object_id=product.id,
            related_object_type="product",
        )

    return movement


async def list_movements(
    db: AsyncSession, product_id: int | None = None, skip: int = 0, limit: int = 100
) -> list[StockMovement]:
    q = select(StockMovement).order_by(StockMovement.created_at.desc())
    if product_id:
        q = q.where(StockMovement.product_id == product_id)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())
