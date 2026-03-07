"""Тесты: /admin/* — админские эндпоинты."""
import pytest


class TestAdminStats:
    def test_get_admin_stats(self, client, admin_headers):
        """GET /admin/stats — общая статистика."""
        resp = client.get("/admin/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_jobs" in data
        assert "total_users" in data
        assert "total_revenue" in data

    def test_admin_stats_forbidden_for_user(self, client, auth_headers):
        """Обычный пользователь не должен видеть admin stats."""
        resp = client.get("/admin/stats", headers=auth_headers)
        assert resp.status_code == 403


class TestAdminJobs:
    def test_get_all_jobs(self, client, admin_headers):
        """GET /admin/jobs — все заявки."""
        resp = client.get("/admin/jobs", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_create_and_delete_job(self, client, admin_headers):
        """Полный цикл: создание → удаление заявки через админку."""
        # Получим id любого пользователя
        users_resp = client.get("/admin/users", headers=admin_headers)
        users = users_resp.json()
        if not users:
            pytest.skip("No users in database")

        user_id = users[0]["id"]

        # Создаём
        resp = client.post("/admin/jobs", headers=admin_headers, json={
            "customer_name": "Админ-тест",
            "title": "Тест через админку",
            "address": "Тест",
            "user_id": user_id,
            "services": [
                {"description": "Тест", "price": 500, "quantity": 1}
            ]
        })
        assert resp.status_code == 200, f"Admin create failed: {resp.text}"
        job_id = resp.json()["id"]

        # Удаляем
        del_resp = client.delete(f"/admin/jobs/{job_id}", headers=admin_headers)
        assert del_resp.status_code == 200


class TestAdminUsers:
    def test_get_all_users(self, client, admin_headers):
        """GET /admin/users — список пользователей."""
        resp = client.get("/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        users = resp.json()
        assert isinstance(users, list)
        assert len(users) > 0

    def test_users_forbidden_for_regular_user(self, client, auth_headers):
        """Обычный пользователь не должен видеть список мастеров."""
        resp = client.get("/admin/users", headers=auth_headers)
        assert resp.status_code == 403


class TestAdminServices:
    def test_crud_service(self, client, admin_headers):
        """Полный CRUD: создание → обновление → удаление услуги."""
        # Создаём
        resp = client.post("/admin/services", headers=admin_headers, json={
            "name": "Тестовая услуга",
            "price": 999.99
        })
        assert resp.status_code == 200
        service = resp.json()
        assert service["name"] == "Тестовая услуга"
        service_id = service["id"]

        # Обновляем
        resp = client.put(f"/admin/services/{service_id}", headers=admin_headers, json={
            "name": "Обновлённая услуга",
            "price": 1500
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "Обновлённая услуга"

        # Удаляем
        resp = client.delete(f"/admin/services/{service_id}", headers=admin_headers)
        assert resp.status_code == 200

    def test_get_services(self, client, admin_headers):
        """GET /admin/services — список услуг."""
        resp = client.get("/admin/services", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
