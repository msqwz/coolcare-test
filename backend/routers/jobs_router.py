"""Роутер заявок мастера: /jobs/*"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, date, timezone
from database import supabase
import schemas
import auth

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/today", response_model=List[schemas.JobResponse])
def get_today_jobs(current_user: dict = Depends(auth.get_current_user)):
    today = date.today().isoformat()

    result = supabase.table("jobs") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .execute()

    today_jobs = [j for j in (result.data or []) if j.get("scheduled_at") and j["scheduled_at"][:10] == today]
    return sorted(today_jobs, key=lambda x: x.get("scheduled_at", ""))


@router.get("/route/optimize")
def get_route_optimize(
    date_str: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Оптимизация порядка визитов (nearest-neighbour) для заявок на указанную дату."""
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    result = supabase.table("jobs") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .execute()

    jobs_data = result.data or []

    jobs_with_coords = [
        j for j in jobs_data
        if j.get("scheduled_at") and j["scheduled_at"][:10] == target_date.isoformat()
        and j.get("latitude") is not None and j.get("longitude") is not None
    ]

    if len(jobs_with_coords) < 2:
        return {"order": [j["id"] for j in jobs_with_coords], "jobs": jobs_with_coords, "total_distance_km": 0}

    import math
    def dist(a, b):
        lat1, lon1 = a["latitude"], a["longitude"]
        lat2, lon2 = b["latitude"], b["longitude"]
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        x = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return 2 * R * math.asin(math.sqrt(x))

    order = []
    remaining = list(jobs_with_coords)
    current = remaining.pop(0)
    order.append(current["id"])
    total_km = 0.0

    while remaining:
        nearest = min(remaining, key=lambda j: dist(current, j))
        total_km += dist(current, nearest)
        current = nearest
        remaining.remove(nearest)
        order.append(current["id"])

    jobs_ordered = [next(j for j in jobs_with_coords if j["id"] == id_) for id_ in order]
    return {"order": order, "jobs": jobs_ordered, "total_distance_km": round(total_km, 2)}


@router.get("", response_model=List[schemas.JobResponse])
def get_jobs(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(auth.get_current_user)
):
    query = supabase.table("jobs").select("*").eq("user_id", current_user["id"])

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.order("scheduled_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data or []


@router.get("/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: int, current_user: dict = Depends(auth.get_current_user)):
    result = supabase.table("jobs") \
        .select("*") \
        .eq("id", job_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@router.post("", response_model=schemas.JobResponse)
def create_job(
    job: schemas.JobCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    # Pydantic parses dates correctly. When dumping, we convert them to ISO strings for Supabase.
    job_data = job.model_dump(exclude_unset=True)
    
    # Ensure datetimes are ISO formatted strings for JSON serialization
    for field in ["scheduled_at", "completed_at"]:
        if isinstance(job_data.get(field), datetime):
            job_data[field] = job_data[field].isoformat()
            
    job_data["user_id"] = current_user["id"]
    job_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = supabase.table("jobs").insert(job_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to insert job to database")
        return result.data[0]
    except Exception as e:
        print(f"❌ Error creating job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.put("/{job_id}", response_model=schemas.JobResponse)
def update_job(
    job_id: int,
    job_update: schemas.JobUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    existing = supabase.table("jobs") \
        .select("id") \
        .eq("id", job_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = job_update.model_dump(exclude_unset=True)

    if not update_data:
        result = supabase.table("jobs").select("*").eq("id", job_id).execute()
        return result.data[0] if result.data else None

    # Ensure datetimes are ISO formatted strings for JSON serialization
    for field in ["scheduled_at", "completed_at"]:
        if isinstance(update_data.get(field), datetime):
            update_data[field] = update_data[field].isoformat()

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = supabase.table("jobs").update(update_data).eq("id", job_id).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update job in database")
        return result.data[0]
    except Exception as e:
        print(f"❌ Error updating job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/{job_id}")
def delete_job(job_id: int, current_user: dict = Depends(auth.get_current_user)):
    existing = supabase.table("jobs") \
        .select("id") \
        .eq("id", job_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")

    supabase.table("jobs").delete().eq("id", job_id).execute()
    return {"message": "Job deleted"}
