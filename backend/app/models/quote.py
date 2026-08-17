from datetime import datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    total_ht: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    tva_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    total_ttc: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="brouillon")
    valid_until: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("Client", back_populates="quotes")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="quotes")
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_ht: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tva_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=20.0)
    subtotal_ttc: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    quote = relationship("Quote", back_populates="items")
    product = relationship("Product", back_populates="quote_items")
