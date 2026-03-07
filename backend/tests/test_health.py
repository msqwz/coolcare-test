"""Тесты: /health — проверка что сервер запускается."""


def test_health_endpoint(client):
    """Эндпоинт /health должен возвращать 200."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")


def test_health_has_database_field(client):
    """Ответ /health должен содержать информацию о БД."""
    resp = client.get("/health")
    data = resp.json()
    assert "database" in data
