"""
Подключение к Supabase для CoolCare PWA
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # service role key 

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("ОШИБКА БЕЗОПАСНОСТИ: SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть указаны в .env. Использование anon ключа запрещено.")

# Бэкенд обладает полными правами (обход RLS) для работы с БД
# Авторизация клиентов происходит на уровне FastAPI
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase_admin = supabase  # Для обратной совместимости импортов в роутерах
