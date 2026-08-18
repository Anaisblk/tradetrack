from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.category import Category
from app.schemas.product import CategoryCreate, ProductCreate, ProductUpdate


PRODUCT_SORT_FIELDS = {
    "name": Product.name,
    "selling_price": Product.selling_price,
    "stock_quantity": Product.stock_quantity,
    "created_at": Product.created_at,
}


TVA_RATE = 20.0  # Single rate. Second-hand goods use VAT on margin instead.


def compute_tva_rate(condition: str) -> float:
    # Rate is always 20%, but second-hand goods are taxed on the margin only
    return TVA_RATE


async def list_products(
    db: AsyncSession, skip: int = 0, limit: int = 100, search: str | None = None,
    category_type: str | None = None,
) -> list[Product]:
    q = select(Product).options(selectinload(Product.category))
    if search or category_type:
        q = q.outerjoin(Product.category)
    if search:
        q = q.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.barcode.ilike(f"%{search}%"),
                Category.name.ilike(f"%{search}%"),
            )
        )
    if category_type:
        q = q.where(Category.type == category_type)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def list_products_paginated(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
    category_type: str | None = None,
) -> tuple[list[Product], int]:
    needs_category_join = bool(search) or order_by == "category" or bool(category_type)
    count_q = select(func.count(Product.id))
    if needs_category_join:
        count_q = count_q.outerjoin(Category, Product.category_id == Category.id)
    if search:
        pattern = f"%{search}%"
        count_q = count_q.where(
            or_(
                Product.name.ilike(pattern),
                Product.barcode.ilike(pattern),
                Category.name.ilike(pattern),
            )
        )
    if category_type:
        count_q = count_q.where(Category.type == category_type)
    total = (await db.execute(count_q)).scalar_one()
    q = select(Product).options(selectinload(Product.category))
    if needs_category_join:
        q = q.outerjoin(Category, Product.category_id == Category.id)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            or_(
                Product.name.ilike(pattern),
                Product.barcode.ilike(pattern),
                Category.name.ilike(pattern),
            )
        )
    if category_type:
        q = q.where(Category.type == category_type)

    if order_by == "category":
        sort_col = Category.name
    else:
        sort_col = PRODUCT_SORT_FIELDS.get(order_by) if order_by else None

    if sort_col is not None:
        q = q.order_by(sort_col.desc() if order_dir == "desc" else sort_col.asc())
    else:
        q = q.order_by(Product.id.desc())

    items = (await db.execute(q.offset(skip).limit(limit))).scalars().all()
    return list(items), total


async def get_product(db: AsyncSession, product_id: int) -> Product | None:
    result = await db.execute(
        select(Product).where(Product.id == product_id)
        .options(selectinload(Product.category))
    )
    return result.scalar_one_or_none()


async def get_by_barcode(db: AsyncSession, barcode: str) -> Product | None:
    result = await db.execute(
        select(Product).where(Product.barcode == barcode)
        .options(selectinload(Product.category))
    )
    return result.scalar_one_or_none()


async def create_product(db: AsyncSession, data: ProductCreate, created_by_id: int | None = None) -> Product:
    product = Product(
        name=data.name,
        category_id=data.category_id,
        barcode=data.barcode,
        purchase_price=data.purchase_price,
        selling_price=data.selling_price,
        stock_quantity=data.stock_quantity,
        condition=data.condition,
        tva_rate=compute_tva_rate(data.condition),
        created_by_id=created_by_id,
    )
    db.add(product)
    await db.flush()
    result = await db.execute(
        select(Product).where(Product.id == product.id)
        .options(selectinload(Product.category))
    )
    return result.scalar_one()


async def update_product(db: AsyncSession, product: Product, data: ProductUpdate) -> Product:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    if data.condition is not None:
        product.tva_rate = compute_tva_rate(data.condition)
    await db.flush()
    result = await db.execute(
        select(Product).where(Product.id == product.id)
        .options(selectinload(Product.category))
    )
    return result.scalar_one()


async def delete_product(db: AsyncSession, product: Product) -> None:
    await db.delete(product)
    await db.flush()


async def list_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category))
    return list(result.scalars().all())


async def create_category(db: AsyncSession, data: CategoryCreate) -> Category:
    cat = Category(name=data.name, type=data.type)
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat
