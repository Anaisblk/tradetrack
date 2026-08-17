from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_vendeur_or_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.pagination import PaginatedProducts
from app.schemas.product import CategoryCreate, CategoryResponse, ProductCreate, ProductResponse, ProductUpdate, StockMovementCreate, StockMovementResponse
from app.services import product_service, stock_service

router = APIRouter(tags=["Products & Stock"])


@router.get("/products", response_model=list[ProductResponse])
async def list_products(
    skip: int = 0, limit: int = 100, search: str | None = None,
    category_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await product_service.list_products(db, skip, limit, search, category_type)


@router.get("/products/paginated", response_model=PaginatedProducts)
async def list_products_paginated(
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
    order_by: str | None = None,
    order_dir: str = "asc",
    category_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = await product_service.list_products_paginated(
        db, skip, limit, search, order_by, order_dir, category_type
    )
    return {"items": items, "total": total}


@router.post("/products", response_model=ProductResponse, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_vendeur_or_admin),
):
    product = await product_service.create_product(db, data, current_user.id)
    await db.commit()
    return product


@router.get("/products/barcode/{barcode}", response_model=ProductResponse)
async def get_by_barcode(
    barcode: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    product = await product_service.get_by_barcode(db, barcode)
    if not product:
        raise HTTPException(404, "Produit introuvable")
    return product


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    product = await product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(404, "Produit introuvable")
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int, data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    product = await product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(404, "Produit introuvable")
    product = await product_service.update_product(db, product, data)
    await db.commit()
    return product


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    product = await product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(404, "Produit introuvable")
    await product_service.delete_product(db, product)
    await db.commit()


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await product_service.list_categories(db)


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    category = await product_service.create_category(db, data)
    await db.commit()
    return category


@router.post("/stock/movements", response_model=StockMovementResponse, status_code=201)
async def add_movement(
    data: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_vendeur_or_admin),
):
    product = await product_service.get_product(db, data.product_id)
    if not product:
        raise HTTPException(404, "Produit introuvable")
    if data.movement_type == "entree":
        product.stock_quantity += data.quantity
    elif data.movement_type in ("sortie", "ajustement"):
        product.stock_quantity = max(0, product.stock_quantity + data.quantity)
    movement = await stock_service.record_movement(
        db, data.product_id, data.movement_type, data.quantity, data.reason, current_user.id
    )
    await db.commit()
    return movement


@router.get("/stock/movements", response_model=list[StockMovementResponse])
async def list_movements(
    product_id: int | None = None, skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await stock_service.list_movements(db, product_id, skip, limit)
