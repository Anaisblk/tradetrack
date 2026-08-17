from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.client import Client
from app.models.product import Product
from app.models.repair import Repair
from app.schemas.dashboard import DashboardAnnual, DashboardMonthly, DashboardToday, ProductBrief


async def get_today(db: AsyncSession) -> DashboardToday:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Recettes des réparations clôturées aujourd'hui (completed_date est un date)
    today_date = now.date()
    result = await db.execute(
        select(func.count(Repair.id), func.coalesce(func.sum(Repair.repair_cost_ttc), 0))
        .where(
            Repair.completed_date == today_date,
            Repair.status == "repare",
        )
    )
    repairs_completed, revenue = result.one()

    # Repairs in progress
    result = await db.execute(
        select(func.count(Repair.id)).where(
            Repair.status.in_(["recu", "en_cours"])
        )
    )
    repairs_in_progress = result.scalar()

    # Appointments today (with correct timezone comparison)
    from app.models.appointment import Appointment
    result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.start_datetime >= today_start,
            Appointment.start_datetime < today_end,
        )
    )
    appointments_today = result.scalar()

    # Low stock
    result = await db.execute(
        select(Product).where(Product.stock_quantity < settings.STOCK_ALERT_THRESHOLD)
    )
    low_stock = [ProductBrief(id=p.id, name=p.name, stock_quantity=p.stock_quantity) for p in result.scalars().all()]

    return DashboardToday(
        revenue_ttc=float(revenue),
        repairs_completed=repairs_completed or 0,
        repairs_in_progress=repairs_in_progress or 0,
        appointments_today=appointments_today or 0,
        low_stock_alerts=low_stock,
    )


async def get_monthly(db: AsyncSession) -> DashboardMonthly:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (month_start + timedelta(days=32)).replace(day=1)

    # Recettes des réparations clôturées ce mois-ci (completed_date est un date)
    result = await db.execute(
        select(func.coalesce(func.sum(Repair.repair_cost_ttc), 0))
        .where(
            Repair.completed_date >= month_start.date(),
            Repair.completed_date < next_month.date(),
            Repair.status == "repare",
        )
    )
    revenue = float(result.scalar() or 0)

    result = await db.execute(
        select(func.count(Repair.id))
        .where(Repair.created_at >= month_start, Repair.created_at < next_month)
    )
    repairs_count = result.scalar() or 0

    result = await db.execute(
        select(func.count(Client.id))
        .where(Client.created_at >= month_start, Client.created_at < next_month)
    )
    new_clients = result.scalar() or 0

    # Recettes quotidiennes des 30 derniers jours, sur les réparations clôturées
    since = now - timedelta(days=30)
    result = await db.execute(
        select(
            Repair.completed_date.label("day"),
            func.sum(Repair.repair_cost_ttc).label("revenue")
        )
        .where(Repair.status == "repare", Repair.completed_date >= since.date())
        .group_by(Repair.completed_date)
        .order_by(Repair.completed_date)
    )
    daily = [{"date": str(row.day), "revenue": float(row.revenue)} for row in result.all()]

    return DashboardMonthly(
        revenue_ttc=revenue,
        repairs_count=repairs_count,
        new_clients=new_clients,
        daily_revenue=daily,
    )


async def get_annual(db: AsyncSession) -> DashboardAnnual:
    now = datetime.now(timezone.utc)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Recettes des réparations clôturées cette année (completed_date est un date)
    result = await db.execute(
        select(func.count(Repair.id), func.coalesce(func.sum(Repair.repair_cost_ttc), 0))
        .where(Repair.completed_date >= year_start.date(), Repair.status == "repare")
    )
    repairs_count, revenue = result.one()

    # Recettes mensuelles des réparations clôturées
    month_expr = func.date_trunc("month", Repair.completed_date)
    result = await db.execute(
        select(
            month_expr.label("month"),
            func.sum(Repair.repair_cost_ttc).label("revenue")
        )
        .where(Repair.completed_date >= year_start.date(), Repair.status == "repare")
        .group_by(month_expr)
        .order_by(month_expr)
    )
    monthly = [{"month": str(row.month.date()), "revenue": float(row.revenue)} for row in result.all()]

    return DashboardAnnual(
        revenue_ttc=float(revenue),
        repairs_count=repairs_count or 0,
        monthly_revenue=monthly,
    )


# ===== Stats atelier (réparations) =====

def _repairs_period_start(period: str, today: date) -> date:
    """Borne de début (incluse) pour une période donnée, sur completed_date."""
    if period == "day":
        return today
    if period == "week":
        return today - timedelta(days=today.weekday())  # lundi de la semaine courante
    if period == "year":
        return today.replace(month=1, day=1)
    # défaut : mois
    return today.replace(day=1)


async def get_repairs_stats(db: AsyncSession, period: str) -> dict:
    today = datetime.now(timezone.utc).date()
    start = _repairs_period_start(period, today)
    result = await db.execute(
        select(
            func.count(Repair.id),
            func.coalesce(func.sum(Repair.repair_cost_ttc), 0),
        )
        .where(
            Repair.status == "repare",
            Repair.completed_date >= start,
            Repair.completed_date <= today,
        )
    )
    count, revenue = result.one()
    return {"period": period, "count": count or 0, "revenue_ttc": float(revenue)}


async def get_repairs_monthly(db: AsyncSession) -> list[dict]:
    year_start = datetime.now(timezone.utc).date().replace(month=1, day=1)
    month_expr = func.date_trunc("month", Repair.completed_date)
    result = await db.execute(
        select(
            month_expr.label("month"),
            func.count(Repair.id).label("count"),
            func.coalesce(func.sum(Repair.repair_cost_ttc), 0).label("revenue"),
        )
        .where(Repair.status == "repare", Repair.completed_date >= year_start)
        .group_by(month_expr)
        .order_by(month_expr)
    )
    return [
        {"month": str(row.month.date())[:7], "count": int(row.count), "revenue_ttc": float(row.revenue)}
        for row in result.all()
    ]


async def get_repairs_daily_revenue(db: AsyncSession) -> list[dict]:
    since = datetime.now(timezone.utc).date() - timedelta(days=30)
    result = await db.execute(
        select(
            Repair.completed_date.label("day"),
            func.coalesce(func.sum(Repair.repair_cost_ttc), 0).label("revenue"),
        )
        .where(Repair.status == "repare", Repair.completed_date >= since)
        .group_by(Repair.completed_date)
        .order_by(Repair.completed_date)
    )
    return [{"date": str(row.day), "revenue": float(row.revenue)} for row in result.all()]


async def get_top_devices(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(
            Repair.device_type,
            Repair.device_brand,
            func.count(Repair.id).label("count"),
        )
        .group_by(Repair.device_type, Repair.device_brand)
        .order_by(func.count(Repair.id).desc())
        .limit(limit)
    )
    return [
        {"device_type": row.device_type, "device_brand": row.device_brand, "count": int(row.count)}
        for row in result.all()
    ]


async def get_repairs_status_breakdown(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Repair.status, func.count(Repair.id).label("count"))
        .group_by(Repair.status)
    )
    return [{"status": row.status, "count": int(row.count)} for row in result.all()]


async def get_repairs_avg_duration(db: AsyncSession) -> dict:
    result = await db.execute(
        select(func.avg(Repair.completed_date - cast(Repair.created_at, Date)))
        .where(Repair.status == "repare", Repair.completed_date.isnot(None))
    )
    avg = result.scalar()
    return {"avg_days": round(float(avg), 1) if avg is not None else None}
