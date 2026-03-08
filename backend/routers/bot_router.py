"""Роутер для приема Webhooks от Telegram бота."""
import os
import logging
from fastapi import APIRouter, Request, BackgroundTasks

import telegram_bot

router = APIRouter(prefix="/bot", tags=["bot"])
logger = logging.getLogger(__name__)


@router.post("/webhook", response_model=dict)
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks) -> dict:
    """Принимает обновления от Telegram (WebHook)."""
    try:
        update = await request.json()
        
        # Обрабатываем только сообщения
        if "message" in update:
            message = update["message"]
            chat_id = message["chat"]["id"]
            text = message.get("text", "")
            
            # Если пользователь написал /start
            if text.startswith("/start"):
                reply_text = (
                    f"Привет! 🤖\n\n"
                    f"Твой <b>Chat ID</b>: <code>{chat_id}</code>\n\n"
                    f"Скопируй этот ID и передай диспетчеру, чтобы получать сюда новые заявки."
                )
                # Отправляем ответ в фоне
                background_tasks.add_task(telegram_bot.send_telegram_message, str(chat_id), reply_text)
                
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}")
        return {"status": "error"}
