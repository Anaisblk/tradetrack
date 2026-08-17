from pydantic import BaseModel

from app.schemas.client import ClientResponse
from app.schemas.product import ProductResponse
from app.schemas.quote import QuoteResponse
from app.schemas.repair import RepairResponse


class PaginatedClients(BaseModel):
    items: list[ClientResponse]
    total: int


class PaginatedRepairs(BaseModel):
    items: list[RepairResponse]
    total: int


class PaginatedProducts(BaseModel):
    items: list[ProductResponse]
    total: int


class PaginatedQuotes(BaseModel):
    items: list[QuoteResponse]
    total: int
