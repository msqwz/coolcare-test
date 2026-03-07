"""
Фикстуры для тестирования CoolCare API.
Используется FastAPI TestClient для отправки запросов без запуска сервера.
"""
import sys
import os
import pytest

# Добавляем backend в sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="session")
def client():
    """TestClient для всех тестов."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers(client):
    """Получает JWT-токен через SMS-авторизацию (тестовый телефон)."""
    test_phone = "+70000000000"

    # Шаг 1: отправить код
    resp = client.post("/auth/send-code", json={"phone": test_phone})
    assert resp.status_code == 200, f"send-code failed: {resp.text}"
    data = resp.json()
    code = data.get("debug_code")
    assert code, "debug_code not returned — проверьте эндпоинт /auth/send-code"

    # Шаг 2: верифицировать код
    resp = client.post("/auth/verify-code", json={"phone": test_phone, "code": code})
    assert resp.status_code == 200, f"verify-code failed: {resp.text}"
    token = resp.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_headers(client):
    """
    Получает JWT-токен admin-пользователя.
    Предполагается, что в базе есть пользователь с role='admin'.
    Если admin не найден, пропускает тесты требующие admin.
    """
    from database import supabase

    # Ищем любого админа в базе
    result = supabase.table("users").select("phone").eq("role", "admin").limit(1).execute()
    if not result.data:
        pytest.skip("No admin user in database — admin tests skipped")

    admin_phone = result.data[0]["phone"]

    resp = client.post("/auth/send-code", json={"phone": admin_phone})
    assert resp.status_code == 200
    code = resp.json().get("debug_code")

    resp = client.post("/auth/verify-code", json={"phone": admin_phone, "code": code})
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}
