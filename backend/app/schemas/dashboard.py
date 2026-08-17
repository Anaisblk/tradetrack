from pydantic import BaseModel


class ProductBrief(BaseModel):
    id: int
    name: str
    stock_quantity: int


class DashboardToday(BaseModel):
    revenue_ttc: float
    repairs_completed: int
    repairs_in_progress: int
    appointments_today: int
    low_stock_alerts: list[ProductBrief]


class DashboardMonthly(BaseModel):
    revenue_ttc: float
    repairs_count: int
    new_clients: int
    daily_revenue: list[dict]


class DashboardAnnual(BaseModel):
    revenue_ttc: float
    repairs_count: int
    monthly_revenue: list[dict]


class RepairsStats(BaseModel):
    period: str
    count: int
    revenue_ttc: float


class RepairsMonthly(BaseModel):
    month: str
    count: int
    revenue_ttc: float


class DailyRevenuePoint(BaseModel):
    date: str
    revenue: float


class TopDevice(BaseModel):
    device_type: str
    device_brand: str | None = None
    count: int


class StatusBreakdown(BaseModel):
    status: str
    count: int


class AvgDuration(BaseModel):
    avg_days: float | None = None
