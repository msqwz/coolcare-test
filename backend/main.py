from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime, date, timezone
import os
from dotenv import load_dotenv

from database import supabase
import schemas
import auth
import logging
from logging.handlers import RotatingFileHandler

# === НАСТРОЙКА ЛОГГИРОВАНИЯ ===
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.log')
file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

# Настройка корневого логгера
logging.basicConfig(level=logging.INFO, handlers=[file_handler, console_handler])

# Логгеры FastAPI/Uvicorn
for log_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"]:
    logger = logging.getLogger(log_name)
    logger.addHandler(file_handler)
    logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

# Загружаем переменные окружения
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: запускаем фоновые задачи при старте"""
    try:
        from push_service import start_reminder_loop
        start_reminder_loop()
    except ImportError:
        print("⚠️  push_service not found, skipping reminder loop")
    except Exception as e:
        print(f"⚠️  Error starting reminder loop: {e}")
    yield


app = FastAPI(title="CoolCare PWA API", version="3.0.0", lifespan=lifespan)

# === CORS Middleware ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://82.97.243.212", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Пути к фронтенду ===
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')
DISPATCHER_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dispatcher', 'dist')


# ==================== Health ====================

@app.get("/health")
def health_check():
    """Проверка доступности сервера и Supabase"""
    try:
        result = supabase.table("users").select("id").limit(1).execute()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": str(e)}


# ==================== Admin ====================

def check_admin(current_user: dict = Depends(auth.get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def calculate_job_total(job: dict) -> float:
    """Расчет общей стоимости заявки: либо основная цена, либо сумма услуг"""
    price = float(job.get("price") or 0)
    if price > 0:
        return price
    
    services = job.get("services") or []
    total = 0.0
    for s in services:
        if isinstance(s, dict):
            p = float(s.get("price") or 0)
            q = float(s.get("quantity") or 1)
            total += p * q
    return total

@app.get("/admin/jobs", response_model=List[schemas.JobResponse])
def get_all_jobs_admin(current_user: dict = Depends(check_admin)):
    """Получение ВСЕХ заявок всех мастеров для диспетчера"""
    result = supabase.table("jobs").select("*").order("scheduled_at", desc=True).execute()
    return result.data or []

@app.get("/admin/stats", response_model=dict)
def get_admin_stats(current_user: dict = Depends(check_admin)):
    """Общая статистика по всей системе для диспетчера"""
    jobs_res = supabase.table("jobs").select("status, price, job_type, completed_at, created_at").execute()
    users_res = supabase.table("users").select("id, is_active").execute()
    
    all_jobs = jobs_res.data or []
    all_users = users_res.data or []
    
    # Расчет выручки
    total_revenue = sum(calculate_job_total(j) for j in all_jobs if j.get("status") == "completed")
    
    # Выручка за текущий месяц
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    monthly_revenue = 0
    for j in all_jobs:
        if j.get("status") == "completed" and j.get("completed_at"):
            try:
                comp_dt = datetime.fromisoformat(j["completed_at"].replace("Z", "+00:00"))
                if comp_dt >= month_start:
                    monthly_revenue += calculate_job_total(j)
            except: pass

    # Распределение по типам
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

@app.get("/admin/users", response_model=List[schemas.UserResponse])
def get_all_users_admin(current_user: dict = Depends(check_admin)):
    """Получение всех пользователей для управления мастерами"""
    result = supabase.table("users").select("*").order("created_at", desc=True).execute()
    return result.data or []

@app.put("/admin/users/{user_id}", response_model=schemas.UserResponse)
def update_user_admin(user_id: int, update_data: schemas.UserUpdate, current_user: dict = Depends(check_admin)):
    """Админское обновление пользователя (смена роли, статуса)"""
    data = update_data.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    result = supabase.table("users").update(data).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]

@app.post("/admin/users", response_model=schemas.UserResponse)
def create_user_admin(user_data: schemas.UserCreate, current_user: dict = Depends(check_admin)):
    """Админское создание пользователя"""
    data = user_data.model_dump()
    
    # Check if user with phone already exists
    existing = supabase.table("users").select("id").eq("phone", data["phone"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User with this phone already exists")
        
    result = supabase.table("users").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return result.data[0]

@app.delete("/admin/users/{user_id}")
def delete_user_admin(user_id: int, current_user: dict = Depends(check_admin)):
    """Админское удаление пользователя"""
    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    result = supabase.table("users").delete().eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "User deleted"}

@app.put("/admin/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job_admin(job_id: int, job_update: schemas.JobUpdate, current_user: dict = Depends(check_admin)):
    """Админское обновление ЛЮБОЙ заявки"""
    update_data = job_update.model_dump(exclude_unset=True)
    if not update_data:
        res = supabase.table("jobs").select("*").eq("id", job_id).execute()
        return res.data[0] if res.data else None

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Обработка дат в обновлении
    for field in ["scheduled_at", "completed_at"]:
        if field in update_data and update_data[field]:
            if isinstance(update_data[field], str):
                try:
                    dt = datetime.fromisoformat(update_data[field].replace("Z", "+00:00"))
                    update_data[field] = dt.isoformat()
                except: pass

    result = supabase.table("jobs").update(update_data).eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]

@app.post("/admin/jobs", response_model=schemas.JobResponse)
def create_job_admin(job: schemas.JobCreate, current_user: dict = Depends(check_admin)):
    """Админское создание заявки для любого мастера"""
    job_data = job.model_dump(exclude_unset=True)
    
    # Обработка дат
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
    
    if not job_data.get("user_id"):
        raise HTTPException(status_code=400, detail="Worker (user_id) must be assigned")

    result = supabase.table("jobs").insert(job_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return result.data[0]

@app.delete("/admin/jobs/{job_id}")
def delete_job_admin(job_id: int, current_user: dict = Depends(check_admin)):
    """Админское удаление ЛЮБОЙ заявки"""
    supabase.table("jobs").delete().eq("id", job_id).execute()
    return {"message": "Job deleted by admin"}

# --- УПРАВЛЕНИЕ СПИСКОМ УСЛУГ ---

@app.get("/admin/services", response_model=List[schemas.ServiceResponse])
def get_admin_services(current_user: dict = Depends(check_admin)):
    result = supabase.table("predefined_services").select("*").order("name").execute()
    return result.data or []

@app.post("/admin/services", response_model=schemas.ServiceResponse)
def create_admin_service(service: schemas.ServiceCreate, current_user: dict = Depends(check_admin)):
    data = service.model_dump()
    result = supabase.table("predefined_services").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create service")
    return result.data[0]

@app.put("/admin/services/{service_id}", response_model=schemas.ServiceResponse)
def update_admin_service(service_id: int, service: schemas.ServiceCreate, current_user: dict = Depends(check_admin)):
    data = service.model_dump()
    result = supabase.table("predefined_services").update(data).eq("id", service_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return result.data[0]

@app.delete("/admin/services/{service_id}")
def delete_admin_service(service_id: int, current_user: dict = Depends(check_admin)):
    supabase.table("predefined_services").delete().eq("id", service_id).execute()
    return {"message": "Service deleted"}


# ==================== Auth ====================

@app.post("/auth/send-code", response_model=dict)
def send_sms_code(request: schemas.PhoneLoginRequest):
    phone = request.phone.replace(" ", "").replace("-", "")

    # Ищем или создаём пользователя
    result = supabase.table("users").select("*").eq("phone", phone).execute()

    if not result.data:
        supabase.table("users").insert({"phone": phone}).execute()

    code = auth.create_sms_code(phone)
    return {"message": "SMS code sent", "phone": phone, "debug_code": code}


@app.post("/auth/verify-code", response_model=schemas.Token)
def verify_sms_code(request: schemas.PhoneVerifyRequest):
    phone = request.phone.replace(" ", "").replace("-", "")

    if not auth.verify_sms_code(phone, request.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    result = supabase.table("users").select("*").eq("phone", phone).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]

    # Обновляем статус верификации
    supabase.table("users").update({"is_verified": True}).eq("id", user["id"]).execute()

    access_token = auth.create_access_token(data={"sub": str(user["id"]), "phone": user["phone"]})
    refresh_token = auth.create_refresh_token(data={"sub": str(user["id"]), "phone": user["phone"]})

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@app.post("/auth/refresh", response_model=schemas.Token)
def refresh_token_endpoint(request: schemas.RefreshRequest):
    payload = auth.decode_token(request.refresh_token)
    if not payload or not payload.user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = supabase.table("users").select("*").eq("id", payload.user_id).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")
    user = result.data[0]

    new_access_token = auth.create_access_token(
        data={"sub": str(user["id"]), "phone": user["phone"]}
    )
    return {
        "access_token": new_access_token,
        "refresh_token": request.refresh_token,
        "token_type": "bearer",
    }


@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: dict = Depends(auth.get_current_user)):
    return current_user


@app.put("/auth/me", response_model=schemas.UserResponse)
def update_current_user(
    update_data: schemas.UserUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    data = update_data.model_dump(exclude_unset=True)
    
    # Защита от самовыдачи прав
    for field in ["role", "is_active"]:
        if field in data:
            del data[field]

    if not data:
        return current_user

    result = supabase.table("users").update(data).eq("id", current_user["id"]).execute()
    return result.data[0]


# ==================== Dashboard ====================

@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
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


@app.post("/dashboard/reset-stats", response_model=schemas.DashboardStats)
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


# ==================== Jobs ====================

@app.get("/jobs/today", response_model=List[schemas.JobResponse])
def get_today_jobs(current_user: dict = Depends(auth.get_current_user)):
    today = date.today().isoformat()

    result = supabase.table("jobs") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .execute()

    today_jobs = [j for j in (result.data or []) if j.get("scheduled_at") and j["scheduled_at"][:10] == today]
    return sorted(today_jobs, key=lambda x: x.get("scheduled_at", ""))


@app.get("/jobs/route/optimize")
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


@app.get("/jobs", response_model=List[schemas.JobResponse])
def get_jobs(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(auth.get_current_user)
):
    query = supabase.table("jobs").select("*").eq("user_id", current_user["id"])

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.order("scheduled_at", desc=True).execute()
    return result.data or []


@app.get("/jobs/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: int, current_user: dict = Depends(auth.get_current_user)):
    result = supabase.table("jobs") \
        .select("*") \
        .eq("id", job_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@app.post("/jobs", response_model=schemas.JobResponse)
def create_job(
    job: schemas.JobCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    job_data = job.model_dump(exclude_unset=True)

    # Преобразуем datetime в ISO-строки для Supabase
    for field in ["scheduled_at", "completed_at"]:
        if field in job_data and job_data[field]:
            if isinstance(job_data[field], datetime):
                job_data[field] = job_data[field].isoformat()
            elif isinstance(job_data[field], str):
                try:
                    dt = datetime.fromisoformat(job_data[field].replace("Z", "+00:00"))
                    job_data[field] = dt.isoformat()
                except (ValueError, TypeError):
                    del job_data[field]

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


@app.put("/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job(
    job_id: int,
    job_update: schemas.JobUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    # Проверяем что заявка принадлежит пользователю
    existing = supabase.table("jobs") \
        .select("id") \
        .eq("id", job_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = job_update.model_dump(exclude_unset=True)

    # Преобразуем datetime в ISO-строки
    for field in ["scheduled_at", "completed_at"]:
        if field in update_data and update_data[field]:
            if isinstance(update_data[field], datetime):
                update_data[field] = update_data[field].isoformat()
            elif isinstance(update_data[field], str):
                try:
                    dt = datetime.fromisoformat(update_data[field].replace("Z", "+00:00"))
                    update_data[field] = dt.isoformat()
                except (ValueError, TypeError):
                    del update_data[field]

    if not update_data:
        result = supabase.table("jobs").select("*").eq("id", job_id).execute()
        return result.data[0] if result.data else None

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = supabase.table("jobs").update(update_data).eq("id", job_id).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update job in database")
        return result.data[0]
    except Exception as e:
        print(f"❌ Error updating job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.delete("/jobs/{job_id}")
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


# ==================== Push ====================

@app.get("/push/vapid-public")
def get_vapid_public():
    """Возвращает публичный VAPID ключ для Web Push подписки."""
    try:
        from push_service import VAPID_PUBLIC
        if not VAPID_PUBLIC:
            raise HTTPException(status_code=503, detail="Push notifications not configured")
        return {"vapid_public": VAPID_PUBLIC}
    except ImportError:
        raise HTTPException(status_code=503, detail="Push service not available")


@app.post("/push/subscribe")
def push_subscribe(
    request: schemas.PushSubscribeRequest,
    current_user: dict = Depends(auth.get_current_user)
):
    """Сохраняет Web Push подписку пользователя."""
    sub_data = {
        "user_id": current_user["id"],
        "endpoint": request.endpoint,
        "p256dh_key": request.keys.p256dh,
        "auth_key": request.keys.auth,
    }
    existing = supabase.table("push_subscriptions").select("id").eq("user_id", current_user["id"]).execute()
    if existing.data:
        supabase.table("push_subscriptions").update(sub_data).eq("user_id", current_user["id"]).execute()
    else:
        supabase.table("push_subscriptions").insert(sub_data).execute()
    return {"status": "ok"}


# ==================== Static Files (Frontend & Dispatcher) ====================

def serve_spa(dist_dir: str, full_path: str):
    if not os.path.exists(dist_dir):
        logger.error(f"Build directory NOT FOUND: {dist_dir}")
        raise HTTPException(status_code=500, detail="Build directory not found")

    clean_path = full_path.strip("/")
    file_path = os.path.join(dist_dir, clean_path)

    if os.path.isfile(file_path):
        # logger.info(f"Serving file: {file_path}") # Слишком много логов
        return FileResponse(file_path)

    is_asset = "." in clean_path or clean_path.startswith("assets/")
    
    if is_asset:
        # Диагностика: что вообще есть в папке?
        try:
            files = os.listdir(dist_dir)
            logger.warning(f"Asset NOT FOUND: {file_path}. Files in {dist_dir}: {files}")
            if os.path.exists(os.path.join(dist_dir, "assets")):
                asset_files = os.listdir(os.path.join(dist_dir, "assets"))
                logger.warning(f"Files in {dist_dir}/assets: {asset_files}")
        except Exception as e:
            logger.error(f"Error listing directory {dist_dir}: {e}")
            
        raise HTTPException(status_code=404, detail=f"Asset {clean_path} not found")

    index_path = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    
    logger.error(f"index.html NOT FOUND in {dist_dir}")
    raise HTTPException(status_code=500, detail="index.html not found")

@app.get("/admin")
@app.get("/admin/")
@app.get("/admin/{full_path:path}")
async def serve_admin(full_path: str = ""):
    """Обслуживание Диспетчерской CRM"""
    return serve_spa(DISPATCHER_DIST, full_path)

@app.get("/{full_path:path}")
async def serve_main_app(full_path: str = ""):
    """Обслуживание основного PWA приложения"""
    # Исключаем API и админку
    api_prefixes = ["auth", "jobs", "push", "dashboard", "admin", "health"]
    if any(full_path.startswith(p) for p in api_prefixes):
        raise HTTPException(status_code=404)
        
    return serve_spa(FRONTEND_DIST, full_path)


# ==================== Запуск ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
