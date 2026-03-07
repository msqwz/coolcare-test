# 📋 CoolCare — Шпаргалка по командам

---

## 🖥️ Локальная разработка (Windows)

```powershell
# Запустить ВСЁ одной командой (backend + frontend + dispatcher)
dev.bat

# Или по отдельности:
cd backend && venv\Scripts\activate && python -m uvicorn main:app --reload   # Backend :8000
cd frontend && npm run dev                                                    # Frontend :5173
cd dispatcher && npm run dev -- --port 5174                                   # Dispatcher :5174
```

---

## 🧪 Тестирование (Windows)

```powershell
# Запустить ВСЕ тесты
cd backend
venv\Scripts\activate
python -m pytest tests/ -v

# Запустить конкретный файл тестов
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_jobs.py -v
python -m pytest tests/test_admin.py -v
python -m pytest tests/test_health.py -v

# Полная pre-deploy проверка (тесты + сборка frontend + dispatcher)
precheck.bat
```

---

## 🚀 Деплой на сервер

```powershell
# 1. Закоммитить и запушить
git add .
git commit -m "описание изменений"
git push origin main

# 2. Подключиться к серверу и задеплоить
ssh root@82.97.243.212
cd /var/www/coolcare
bash deploy.sh
```

---

## 🔧 Сервер (Linux SSH)

```bash
# Подключение
ssh root@82.97.243.212

# Перейти в проект
cd /var/www/coolcare

# Деплой
bash deploy.sh

# Перезапуск бэкенда вручную
systemctl restart coolcare

# Логи бэкенда
journalctl -u coolcare -f
cat backend/app.log

# Логи Nginx
tail -f /var/log/nginx/error.log

# Статус сервиса
systemctl status coolcare

# Установить пакет Python на сервере
source backend/venv/bin/activate
pip install <пакет>

# Тесты на сервере
source backend/venv/bin/activate
cd backend
python -m pytest tests/ -v
```

---

## 📦 Зависимости

```powershell
# Установить Python зависимости (Windows)
cd backend
venv\Scripts\activate
pip install -r requirements.txt

# Установить Node зависимости
cd frontend && npm install
cd dispatcher && npm install
```

---

## 🔑 Важные URL

| Что | URL |
|---|---|
| Сервер (продакшн) | http://82.97.243.212 |
| Админ-панель (продакшн) | http://82.97.243.212/admin |
| Локальный backend | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Локальный frontend | http://localhost:5173 |
| Локальный dispatcher | http://localhost:5174 |
| Supabase Dashboard | https://supabase.com/dashboard |

---

## 🔄 Git

```powershell
git status                    # Что изменилось
git diff                     # Подробные изменения
git add .                    # Добавить все файлы
git commit -m "сообщение"    # Сохранить изменения
git push origin main         # Отправить на GitHub
git pull origin main         # Получить с GitHub
git log -n 5 --oneline       # Последние 5 коммитов
```
