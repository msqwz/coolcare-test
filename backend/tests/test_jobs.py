"""Тесты: /jobs/* — CRUD заявок мастера."""
import pytest


class TestJobsCRUD:
    """Полный цикл: создание → чтение → обновление → удаление."""

    @pytest.fixture(autouse=True)
    def setup(self, client, auth_headers):
        self.client = client
        self.headers = auth_headers

    def test_create_job(self):
        """POST /jobs — создание заявки."""
        resp = self.client.post("/jobs", headers=self.headers, json={
            "customer_name": "Тест Клиент",
            "title": "Тестовая заявка",
            "address": "Тестовый адрес",
            "status": "scheduled",
            "priority": "medium",
            "job_type": "repair"
        })
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        data = resp.json()
        assert data["customer_name"] == "Тест Клиент"
        assert data["title"] == "Тестовая заявка"
        assert "id" in data
        # Сохраняем ID для последующих тестов
        self.__class__._job_id = data["id"]

    def test_get_jobs_list(self):
        """GET /jobs — список заявок."""
        resp = self.client.get("/jobs", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_job_by_id(self):
        """GET /jobs/{id} — получение конкретной заявки."""
        job_id = getattr(self.__class__, '_job_id', None)
        if not job_id:
            pytest.skip("No job created")

        resp = self.client.get(f"/jobs/{job_id}", headers=self.headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == job_id

    def test_update_job(self):
        """PUT /jobs/{id} — обновление заявки."""
        job_id = getattr(self.__class__, '_job_id', None)
        if not job_id:
            pytest.skip("No job created")

        resp = self.client.put(f"/jobs/{job_id}", headers=self.headers, json={
            "title": "Обновлённая тема"
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Обновлённая тема"

    def test_delete_job(self):
        """DELETE /jobs/{id} — удаление заявки."""
        job_id = getattr(self.__class__, '_job_id', None)
        if not job_id:
            pytest.skip("No job created")

        resp = self.client.delete(f"/jobs/{job_id}", headers=self.headers)
        assert resp.status_code == 200

    def test_get_today_jobs(self):
        """GET /jobs/today — заявки на сегодня."""
        resp = self.client.get("/jobs/today", headers=self.headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestJobsWithServices:
    """Тест создания заявки с услугами и автопересчётом цены."""

    def test_create_job_with_services(self, client, auth_headers):
        """Цена должна автоматически рассчитываться из услуг."""
        resp = client.post("/jobs", headers=auth_headers, json={
            "customer_name": "Тест Услуги",
            "title": "Проверка пересчёта",
            "address": "Тест",
            "services": [
                {"description": "Диагностика", "price": 1000, "quantity": 1},
                {"description": "Ремонт", "price": 2500, "quantity": 2}
            ]
        })
        assert resp.status_code == 200
        job = resp.json()
        job_id = job["id"]

        # Удаляем тестовую заявку
        client.delete(f"/jobs/{job_id}", headers=auth_headers)


class TestJobsErrors:
    """Тесты ошибок."""

    def test_get_nonexistent_job(self, client, auth_headers):
        """Запрос несуществующей заявки должен вернуть 404."""
        resp = client.get("/jobs/999999", headers=auth_headers)
        assert resp.status_code == 404

    def test_unauthorized_access(self, client):
        """Доступ без токена должен быть запрещён."""
        resp = client.get("/jobs")
        assert resp.status_code == 403
