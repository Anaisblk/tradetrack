from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    related_object_id: int | None = None
    related_object_type: str | None = None
    created_at: datetime
