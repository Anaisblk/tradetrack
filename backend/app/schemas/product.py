from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    type: str  # article / piece


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ProductBase(BaseModel):
    name: str
    category_id: int | None = None
    barcode: str | None = None
    purchase_price: float
    selling_price: float
    stock_quantity: int = 0
    condition: str = "neuf"  # neuf / occasion


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    barcode: str | None = None
    purchase_price: float | None = None
    selling_price: float | None = None
    stock_quantity: int | None = None
    condition: str | None = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tva_rate: float
    created_at: datetime
    category: CategoryResponse | None = None


class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: str
    quantity: int
    reason: str | None = None


class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    movement_type: str
    quantity: int
    reason: str | None = None
    created_at: datetime
