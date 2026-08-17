from datetime import datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Repair(Base):
    __tablename__ = "repairs"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    technicien_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    device_type: Mapped[str] = mapped_column(String(100), nullable=False)
    device_brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    problem_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="recu")
    repair_cost_ht: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    tva_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    repair_cost_ttc: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    estimated_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    completed_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("Client", back_populates="repairs")
    technicien = relationship("User", foreign_keys=[technicien_id], back_populates="repairs")
    items = relationship("RepairItem", back_populates="repair", cascade="all, delete-orphan")


class RepairItem(Base):
    __tablename__ = "repair_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    repair_id: Mapped[int] = mapped_column(ForeignKey("repairs.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_ht: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal_ttc: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    repair = relationship("Repair", back_populates="items")
    product = relationship("Product", back_populates="repair_items")
