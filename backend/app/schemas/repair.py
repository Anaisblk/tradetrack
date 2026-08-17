from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.client import ClientBrief


class RepairItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price_ht: float | None = None


class RepairItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price_ht: float
    subtotal_ttc: float


class RepairCreate(BaseModel):
    client_id: int | None = None
    technicien_id: int | None = None
    device_type: str
    device_brand: str | None = None
    device_model: str | None = None
    serial_number: str | None = None
    problem_description: str | None = None
    deposit_amount: float = 0.0
    estimated_cost: Decimal | None = None
    payment_method: str | None = None
    estimated_date: date | None = None
    notes: str | None = None


class RepairUpdate(BaseModel):
    technicien_id: int | None = None
    diagnosis: str | None = None
    status: str | None = None
    repair_cost_ht: float | None = None
    deposit_amount: float | None = None
    estimated_cost: Decimal | None = None
    payment_method: str | None = None
    estimated_date: date | None = None
    completed_date: date | None = None
    notes: str | None = None
    items: list[RepairItemCreate] | None = None


class RepairResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None = None
    technicien_id: int | None = None
    device_type: str
    device_brand: str | None = None
    device_model: str | None = None
    serial_number: str | None = None
    problem_description: str | None = None
    diagnosis: str | None = None
    status: str
    repair_cost_ht: float
    tva_amount: float
    repair_cost_ttc: float
    deposit_amount: float
    estimated_cost: Decimal | None = None
    payment_method: str | None = None
    estimated_date: date | None = None
    completed_date: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    client: ClientBrief | None = None
    items: list[RepairItemResponse] = []
