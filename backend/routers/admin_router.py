"""Роутер администратора: /admin/*"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from database import supabase
import schemas
import auth
from utils import check_admin, calculate_job_total, auto_calc_services_price

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/jobs", response_model=List[schemas.JobResponse])
def get_all_jobs_admin(current_user: dict = Depends(check_admin)):
    """Получение ВСЕХ заявок всех мастеров для диспетчера."""
    result = supabase.table("jobs").select("*").order("scheduled_at", desc=True).execute()
    return result.data or []


@router.get("/stats", response_model=dict)
def get_admin_stats(current_user: dict = Depends(check_admin)):
    """Общая статистика по всей системе для диспетчера."""
    jobs_res = supabase.table("jobs").select("status, price, job_type, completed_at, created_at, services").execute()
    users_res = supabase.table("users").select("id, is_active").execute()

    all_jobs = jobs_res.data or []
    all_users = users_res.data or []

    total_revenue = sum(calculate_job_total(j) for j in all_jobs if j.get("status") == "completed")

    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    monthly_revenue = 0
    for j in all_jobs:
        if j.get("status") == "completed" and j.get("completed_at"):
            try:
                comp_dt = datetime.fromisoformat(j["completed_at"].replace("Z", "+00:00"))
                if comp_dt >= month_start:
                    monthly_revenue += calculate_job_total(j)
            except:
                pass

    type_dist = {}
    for j in all_jobs:
        jt = j.get("job_type") or "other"
        type_dist[jt] = type_dist.get(jt, 0) + 1

    return {
        "total_jobs": len(all_jobs),
        "total_users": len(all_users),
        "active_users": len([u for u in all_users if u.get("is_active")]),
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "active_jobs": len([j for j in all_jobs if j.get("status") == "active"]),
        "completed_jobs": len([j for j in all_jobs if j.get("status") == "completed"]),
        "type_distribution": type_dist
    }


# --- Пользователи ---

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users_admin(current_user: dict = Depends(check_admin)):
    result = supabase.table("users").select("*").order("created_at", desc=True).execute()
    return result.data or []


@router.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user_admin(user_id: int, update_data: schemas.UserUpdate, current_user: dict = Depends(check_admin)):
    data = update_data.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")

    result = supabase.table("users").update(data).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.post("/users", response_model=schemas.UserResponse)
def create_user_admin(user_data: schemas.UserCreate, current_user: dict = Depends(check_admin)):
    data = user_data.model_dump()

    existing = supabase.table("users").select("id").eq("phone", data["phone"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User with this phone already exists")

    result = supabase.table("users").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return result.data[0]


@router.delete("/users/{user_id}")
def delete_user_admin(user_id: int, current_user: dict = Depends(check_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = supabase.table("users").delete().eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "User deleted"}


# --- Заявки ---

@router.put("/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job_admin(job_id: int, job_update: schemas.JobUpdate, current_user: dict = Depends(check_admin)):
    """Админское обновление ЛЮБОЙ заявки."""
    update_data = job_update.model_dump(exclude_unset=True)
    if not update_data:
        res = supabase.table("jobs").select("*").eq("id", job_id).execute()
        return res.data[0] if res.data else None

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = auto_calc_services_price(update_data)

    for field in ["scheduled_at", "completed_at"]:
        if field in update_data and update_data[field]:
            if isinstance(update_data[field], str):
                try:
                    dt = datetime.fromisoformat(update_data[field].replace("Z", "+00:00"))
                    update_data[field] = dt.isoformat()
                except:
                    pass

    result = supabase.table("jobs").update(update_data).eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@router.post("/jobs", response_model=schemas.JobResponse)
def create_job_admin(job: schemas.JobCreate, current_user: dict = Depends(check_admin)):
    """Админское создание заявки для любого мастера."""
    job_data = job.model_dump(exclude_unset=True)

    for field in ["scheduled_at", "completed_at"]:
        if field in job_data and job_data[field]:
            if isinstance(job_data[field], datetime):
                job_data[field] = job_data[field].isoformat()
            elif isinstance(job_data[field], str):
                try:
                    dt = datetime.fromisoformat(job_data[field].replace("Z", "+00:00"))
                    job_data[field] = dt.isoformat()
                except:
                    pass

    job_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    job_data = auto_calc_services_price(job_data)

    if not job_data.get("user_id"):
        raise HTTPException(status_code=400, detail="Worker (user_id) must be assigned")

    result = supabase.table("jobs").insert(job_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")

    # Telegram-уведомление мастеру
    try:
        from telegram_bot import notify_worker_new_job
        created_job = result.data[0]
        worker = supabase.table("users").select("*").eq("id", created_job["user_id"]).execute()
        if worker.data:
            notify_worker_new_job(created_job, worker.data[0])
    except Exception as e:
        print(f"⚠️ Telegram notification error: {e}")

    return result.data[0]


@router.delete("/jobs/{job_id}")
def delete_job_admin(job_id: int, current_user: dict = Depends(check_admin)):
    supabase.table("jobs").delete().eq("id", job_id).execute()
    return {"message": "Job deleted by admin"}


# --- Услуги ---

@router.get("/services", response_model=List[schemas.ServiceResponse])
def get_admin_services(current_user: dict = Depends(check_admin)):
    result = supabase.table("predefined_services").select("*").order("name").execute()
    return result.data or []


@router.post("/services", response_model=schemas.ServiceResponse)
def create_admin_service(service: schemas.ServiceCreate, current_user: dict = Depends(check_admin)):
    data = service.model_dump()
    result = supabase.table("predefined_services").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create service")
    return result.data[0]


@router.put("/services/{service_id}", response_model=schemas.ServiceResponse)
def update_admin_service(service_id: int, service: schemas.ServiceCreate, current_user: dict = Depends(check_admin)):
    data = service.model_dump()
    result = supabase.table("predefined_services").update(data).eq("id", service_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return result.data[0]


@router.delete("/services/{service_id}")
def delete_admin_service(service_id: int, current_user: dict = Depends(check_admin)):
    supabase.table("predefined_services").delete().eq("id", service_id).execute()
    return {"message": "Service deleted"}
