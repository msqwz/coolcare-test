"""Роутер Push-уведомлений: /push/*"""
from fastapi import APIRouter, Depends, HTTPException
from database import supabase
import schemas
import auth

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public")
def get_vapid_public():
    """Возвращает публичный VAPID ключ для Web Push подписки."""
    try:
        from push_service import VAPID_PUBLIC
        if not VAPID_PUBLIC:
            raise HTTPException(status_code=503, detail="Push notifications not configured")
        return {"vapid_public": VAPID_PUBLIC}
    except ImportError:
        raise HTTPException(status_code=503, detail="Push service not available")


@router.post("/subscribe")
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
