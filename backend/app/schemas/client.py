from pydantic import BaseModel, ConfigDict


class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class ClientResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None


class ClientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    phone: str | None = None
