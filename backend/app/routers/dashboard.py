from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_vendeur_or_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import (
    AvgDuration,
    DailyRevenuePoint,
    DashboardAnnual,
    DashboardMonthly,
    DashboardToday,
    RepairsMonthly,
    RepairsStats,
    StatusBreakdown,
    TopDevice,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/today", response_model=DashboardToday)
async def get_today(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_today(db)


@router.get("/monthly", response_model=DashboardMonthly)
async def get_monthly(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_monthly(db)


@router.get("/annual", response_model=DashboardAnnual)
async def get_annual(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_annual(db)


@router.get("/repairs-stats", response_model=RepairsStats)
async def get_repairs_stats(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_repairs_stats(db, period)


@router.get("/repairs-monthly", response_model=list[RepairsMonthly])
async def get_repairs_monthly(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_repairs_monthly(db)


@router.get("/repairs-daily-revenue", response_model=list[DailyRevenuePoint])
async def get_repairs_daily_revenue(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_repairs_daily_revenue(db)


@router.get("/top-devices", response_model=list[TopDevice])
async def get_top_devices(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_top_devices(db, limit)


@router.get("/repairs-status-breakdown", response_model=list[StatusBreakdown])
async def get_repairs_status_breakdown(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_repairs_status_breakdown(db)


@router.get("/repairs-avg-duration", response_model=AvgDuration)
async def get_repairs_avg_duration(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_vendeur_or_admin),
):
    return await dashboard_service.get_repairs_avg_duration(db)
