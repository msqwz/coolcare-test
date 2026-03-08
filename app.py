#!/usr/bin/env python3
import sys
import os
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')

os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

print("Starting CoolCare PWA server...")
import uvicorn

if __name__ == "__main__":
    # Передаем приложение строкой "main:app" вместо объекта app,
    # чтобы избежать конфликтов и ошибок инициализации asyncio loops (особенно в Python 3.12+)
    # при создании клиента Supabase до запуска Uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")
