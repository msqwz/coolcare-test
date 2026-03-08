"""Роутер аутентификации: /auth/*"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from database import supabase
import schemas
import auth
from telegram_bot import send_telegram_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-code", response_model=dict)
def send_sms_code(request: schemas.PhoneLoginRequest) -> dict:
    phone = request.phone.replace(" ", "").replace("-", "")

    result = supabase.table("users").select("*").eq("phone", phone).execute()
    user = None
    if not result.data:
        insert_res = supabase.table("users").insert({"phone": phone}).execute()
        if insert_res.data:
            user = insert_res.data[0]
    else:
        user = result.data[0]

    code = auth.create_sms_code(phone)

    # Отправка кода в Telegram (если указан chat_id)
    if user and user.get("telegram_chat_id"):
        try:
            msg = f"🔐 Ваш код авторизации CoolCare: <b>{code}</b>\n\nНикому его не сообщайте."
            send_telegram_message(user["telegram_chat_id"], msg)
            logger.info(f"Auth code sent via Telegram to {phone}")
        except Exception as e:
            logger.error(f"Failed to send auth code via Telegram: {e}")

    return {"message": "Code sent", "phone": phone}


@router.post("/verify-code", response_model=schemas.Token)
def verify_sms_code_endpoint(request: schemas.PhoneVerifyRequest) -> dict:
    phone = request.phone.replace(" ", "").replace("-", "")

    if not auth.verify_sms_code(phone, request.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    result = supabase.table("users").select("*").eq("phone", phone).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    supabase.table("users").update({"is_verified": True}).eq("id", user["id"]).execute()

    access_token = auth.create_access_token(data={"sub": str(user["id"]), "phone": user["phone"]})
    refresh_token = auth.create_refresh_token(data={"sub": str(user["id"]), "phone": user["phone"]})

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=schemas.Token)
def refresh_token_endpoint(request: schemas.RefreshRequest) -> dict:
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


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: dict = Depends(auth.get_current_user)) -> dict:
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_current_user(
    update_data: schemas.UserUpdate,
    current_user: dict = Depends(auth.get_current_user)
) -> dict:
    data = update_data.model_dump(exclude_unset=True)

    for field in ["role", "is_active"]:
        if field in data:
            del data[field]

    if not data:
        return current_user

    result = supabase.table("users").update(data).eq("id", current_user["id"]).execute()
    return result.data[0]
