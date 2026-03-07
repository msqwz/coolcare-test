"""Telegram-бот для уведомления мастеров о новых заявках."""
import os
import threading
import urllib.request
import urllib.parse
import json
import logging

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")


def send_telegram_message(chat_id: str, text: str) -> bool:
    """Отправляет сообщение в Telegram."""
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = json.dumps({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        logger.error(f"Telegram send error: {e}")
        return False


def setup_webhook(app_url: str) -> bool:
    """Устанавливает webhook для получения сообщений от Telegram."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN no set, skipping webhook setup.")
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook"
        webhook_url = f"{app_url.rstrip('/')}/bot/webhook"
        data = json.dumps({"url": webhook_url}).encode("utf-8")
        
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                logger.info(f"Telegram webhook set to {webhook_url}")
                return True
            return False
    except Exception as e:
        logger.error(f"Failed to set Telegram webhook: {e}")
        return False


def format_job_message(job: dict) -> str:
    """Форматирует данные заявки в Telegram-сообщение."""
    job_id = job.get("id", "?")
    customer = job.get("customer_name") or "Не указан"
    address = job.get("address") or "Не указан"
    title = job.get("title") or "Без темы"
    phone = job.get("customer_phone") or ""
    price = job.get("price") or 0
    scheduled = job.get("scheduled_at") or ""

    # Форматируем дату
    date_str = ""
    if scheduled:
        try:
            from datetime import datetime
            if isinstance(scheduled, str):
                dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
            else:
                dt = scheduled
            date_str = dt.strftime("%d.%m.%Y %H:%M")
        except:
            date_str = str(scheduled)[:16]

    # Собираем список услуг
    services = job.get("services") or []
    services_text = ""
    if services:
        lines = []
        for s in services:
            if isinstance(s, dict):
                desc = s.get("description") or "Услуга"
                p = s.get("price") or 0
                q = s.get("quantity") or 1
                lines.append(f"  • {desc} — {p}₽ × {q}")
        if lines:
            services_text = "\n🔧 <b>Услуги:</b>\n" + "\n".join(lines)

    msg = f"""📋 <b>Новая заявка #{job_id}</b>

👤 <b>Клиент:</b> {customer}"""

    if phone:
        msg += f"\n📞 <b>Телефон:</b> {phone}"

    msg += f"""
📍 <b>Адрес:</b> {address}
🛠 <b>Тема:</b> {title}"""

    if date_str:
        msg += f"\n📅 <b>Дата:</b> {date_str}"

    if price:
        msg += f"\n💰 <b>Сумма:</b> {price}₽"

    msg += services_text

    return msg


def notify_worker_new_job(job: dict, worker: dict):
    """Отправляет уведомление мастеру о новой заявке (в фоне)."""
    chat_id = worker.get("telegram_chat_id")
    if not chat_id:
        logger.info(f"Worker {worker.get('id')} has no telegram_chat_id, skipping notification")
        return

    text = format_job_message(job)

    # Отправляем в фоновом потоке, чтобы не задерживать API
    def _send():
        success = send_telegram_message(chat_id, text)
        if success:
            logger.info(f"Telegram notification sent to worker {worker.get('id')}")
        else:
            logger.warning(f"Failed to send Telegram notification to worker {worker.get('id')}")

    threading.Thread(target=_send, daemon=True).start()
