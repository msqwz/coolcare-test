"""Web Push notifications service."""
import os
import json
import threading
import time
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from database import supabase

load_dotenv()

VAPID_PRIVATE = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC = os.getenv("VAPID_PUBLIC_KEY")
REMINDER_MINUTES = int(os.getenv("PUSH_REMINDER_MINUTES", "30"))


def send_push_to_subscription(subscription, title: str, body: str):
    """Send a Web Push notification to a subscription."""
    if not VAPID_PRIVATE or not VAPID_PUBLIC:
        return False
    try:
        from pywebpush import webpush, WebPushException
        sub_info = {
            "endpoint": subscription["endpoint"],
            "keys": {
                "p256dh": subscription["p256dh_key"],
                "auth": subscription["auth_key"],
            },
        }
        payload = json.dumps({"title": title, "body": body})
        webpush(
            subscription_info=sub_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE,
            vapid_claims={"sub": "mailto:admin@coolcare.local"},
        )
        return True
    except Exception as e:
        print(f"Push send error: {e}")
        return False


def check_and_send_reminders():
    """Check for jobs starting soon and send push reminders."""
    if not VAPID_PRIVATE:
        return
    try:
        now = datetime.now(timezone.utc)
        window_start = now
        window_end = now + timedelta(minutes=REMINDER_MINUTES)
        result = supabase.table("jobs").select("*").execute()
        jobs = result.data or []
        subs_result = supabase.table("push_subscriptions").select("*").execute()
        subs = {s["user_id"]: s for s in (subs_result.data or [])}
        sent = set()
        for job in jobs:
            if job.get("status") in ("completed", "cancelled"):
                continue
            st = job.get("scheduled_at")
            if not st:
                continue
            if isinstance(st, str) and st.endswith("Z"):
                st = st[:-1] + "+00:00"
            try:
                job_time = datetime.fromisoformat(st.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                continue
            if window_start <= job_time <= window_end:
                user_id = job.get("user_id")
                if user_id in subs and (user_id, job["id"]) not in sent:
                    sub = subs[user_id]
                    customer = job.get("customer_name") or "Клиент"
                    addr = job.get("address") or ""
                    title = f"Напоминание: {customer}"
                    body = f"Через {REMINDER_MINUTES} мин: {addr}"[:100]
                    if send_push_to_subscription(sub, title, body):
                        sent.add((user_id, job["id"]))
    except Exception as e:
        print(f"Push reminder check error: {e}")


def start_reminder_loop():
    """Start background thread that checks for reminders every 5 minutes."""
    def loop():
        while True:
            time.sleep(300)
            check_and_send_reminders()

    t = threading.Thread(target=loop, daemon=True)
    t.start()
