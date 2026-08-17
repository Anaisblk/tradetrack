from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.client import ClientBrief


class QuoteItemCreate(BaseModel):
    product_id: int | None = None
    description: str | None = None
    quantity: int
    unit_price_ht: float
    tva_rate: float = 20.0


class QuoteItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int | None = None
    description: str | None = None
    quantity: int
    unit_price_ht: float
    tva_rate: float
    subtotal_ttc: float


class QuoteCreate(BaseModel):
    client_id: int | None = None
    notes: str | None = None
    valid_until: date | None = None
    items: list[QuoteItemCreate]


class QuoteUpdate(BaseModel):
    client_id: int | None = None
    notes: str | None = None
    valid_until: date | None = None
    status: str | None = None
    items: list[QuoteItemCreate] | None = None


class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None = None
    created_by_id: int
    total_ht: float
    tva_amount: float
    total_ttc: float
    status: str
    valid_until: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    client: ClientBrief | None = None
    items: list[QuoteItemResponse] = []
