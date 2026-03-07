"""Тесты: /auth/* — аутентификация и профиль."""


class TestSendCode:
    def test_send_code_success(self, client):
        """Отправка SMS-кода должна вернуть 200."""
        resp = client.post("/auth/send-code", json={"phone": "+70000000001"})
        assert resp.status_code == 200
        data = resp.json()
        assert "debug_code" in data
        assert len(data["debug_code"]) == 6

    def test_send_code_invalid_body(self, client):
        """Пустой запрос должен вернуть 422."""
        resp = client.post("/auth/send-code", json={})
        assert resp.status_code == 422


class TestVerifyCode:
    def test_verify_valid_code(self, client):
        """Верификация правильного кода должна вернуть токен."""
        phone = "+70000000002"
        send_resp = client.post("/auth/send-code", json={"phone": phone})
        code = send_resp.json()["debug_code"]

        resp = client.post("/auth/verify-code", json={"phone": phone, "code": code})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_verify_wrong_code(self, client):
        """Неправильный код должен вернуть 400."""
        phone = "+70000000003"
        client.post("/auth/send-code", json={"phone": phone})

        resp = client.post("/auth/verify-code", json={"phone": phone, "code": "000000"})
        assert resp.status_code == 400


class TestProfile:
    def test_get_me(self, client, auth_headers):
        """GET /auth/me должен вернуть профиль текущего пользователя."""
        resp = client.get("/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "phone" in data

    def test_update_me(self, client, auth_headers):
        """PUT /auth/me должен обновить имя."""
        resp = client.put("/auth/me", headers=auth_headers, json={"name": "Тестовый"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Тестовый"

    def test_unauthorized_me(self, client):
        """GET /auth/me без токена должен вернуть 401."""
        resp = client.get("/auth/me")
        assert resp.status_code == 401


class TestRefreshToken:
    def test_refresh_token(self, client):
        """Обновление токена через refresh_token."""
        phone = "+70000000004"
        send_resp = client.post("/auth/send-code", json={"phone": phone})
        code = send_resp.json()["debug_code"]

        verify_resp = client.post("/auth/verify-code", json={"phone": phone, "code": code})
        refresh_token = verify_resp.json()["refresh_token"]

        resp = client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()
