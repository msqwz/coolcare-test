"""Роутер дашборда: /dashboard/*"""
from fastapi import APIRouter, Depends
from typing import List
from datetime import date
from database import supabase
import schemas
import auth
from utils import calculate_job_total

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(current_user: dict = Depends(auth.get_current_user)):
    result = supabase.table("jobs") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .execute()

    all_jobs = result.data or []
    today = date.today().isoformat()

    today_jobs = [j for j in all_jobs if j.get("scheduled_at") and j["scheduled_at"][:10] == today]
    scheduled_jobs = [j for j in all_jobs if j.get("status") == "scheduled"]
    active_jobs = [j for j in all_jobs if j.get("status") == "active"]
    completed_jobs = [j for j in all_jobs if j.get("status") == "completed"]
    cancelled_jobs = [j for j in all_jobs if j.get("status") == "cancelled"]
    total_revenue = sum(calculate_job_total(j) for j in completed_jobs)
    today_revenue = sum(calculate_job_total(j) for j in today_jobs if j.get("status") == "completed")

    return {
        "total_jobs": len(all_jobs),
        "today_jobs": len(today_jobs),
        "scheduled_jobs": len(scheduled_jobs),
        "active_jobs": len(active_jobs),
        "completed_jobs": len(completed_jobs),
        "cancelled_jobs": len(cancelled_jobs),
        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
    }


@router.post("/reset-stats", response_model=schemas.DashboardStats)
def reset_dashboard_stats(current_user: dict = Depends(auth.get_current_user)):
    """Сброс статистики: удаляет завершённые и отменённые заявки пользователя."""
    rows = supabase.table("jobs") \
        .select("id,status") \
        .eq("user_id", current_user["id"]) \
        .execute()
    for row in (rows.data or []):
        if row.get("status") in ("completed", "cancelled"):
            supabase.table("jobs").delete().eq("id", row["id"]).eq("user_id", current_user["id"]).execute()
    return get_dashboard_stats(current_user)
