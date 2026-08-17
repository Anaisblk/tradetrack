from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    purchase_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    selling_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    condition: Mapped[str] = mapped_column(String(10), nullable=False, default="neuf")  # neuf / occasion
    tva_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=20.0)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    created_by = relationship("User", foreign_keys=[created_by_id])
    repair_items = relationship("RepairItem", back_populates="product")
    quote_items = relationship("QuoteItem", back_populates="product")
    stock_movements = relationship("StockMovement", back_populates="product")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)  # entree/sortie/ajustement/vente/reparation
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="stock_movements")
    created_by = relationship("User", foreign_keys=[created_by_id])
