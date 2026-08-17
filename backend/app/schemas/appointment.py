from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.client import ClientBrief


class AppointmentCreate(BaseModel):
    client_id: int | None = None
    assigned_to_id: int | None = None
    title: str
    description: str | None = None
    start_datetime: datetime
    end_datetime: datetime
    status: str = "planifie"


class AppointmentUpdate(BaseModel):
    client_id: int | None = None
    assigned_to_id: int | None = None
    title: str | None = None
    description: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    status: str | None = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None = None
    created_by_id: int
    assigned_to_id: int | None = None
    title: str
    description: str | None = None
    start_datetime: datetime
    end_datetime: datetime
    status: str
    reminder_sent: bool
    created_at: datetime
    updated_at: datetime
    client: ClientBrief | None = None
