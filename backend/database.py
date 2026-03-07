"""
Подключение к Supabase для CoolCare PWA
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # anon key для основных операций
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # service key для админских операций

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL и SUPABASE_KEY должны быть указаны в .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Admin client для операций с пользователями (обход RLS)
if SUPABASE_SERVICE_KEY:
    supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase_admin = supabase  # fallback к обычному client
