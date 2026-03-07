@echo off
chcp 65001 >nul
echo ============================================
echo  🚀 CoolCare — Локальная разработка
echo ============================================
echo.

:: Проверка Python
where python >nul 2>&1
if errorlevel 1 (
    echo ❌ Python не найден! Установите Python 3.10+
    pause
    exit /b 1
)

:: Проверка venv
if not exist "backend\venv\Scripts\activate.bat" (
    echo 📦 Создаю виртуальное окружение...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
) 

:: Проверка node_modules
if not exist "frontend\node_modules" (
    echo 📦 Устанавливаю зависимости frontend...
    cd frontend && npm install && cd ..
)
if not exist "dispatcher\node_modules" (
    echo 📦 Устанавливаю зависимости dispatcher...
    cd dispatcher && npm install && cd ..
)

echo.
echo 🔧 Запускаю Backend (порт 8000)...
start "CoolCare Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 >nul

echo 🌐 Запускаю Frontend (порт 5173)...
start "CoolCare Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 1 >nul

echo 📋 Запускаю Dispatcher / Админ-панель (порт 5174)...
start "CoolCare Dispatcher" cmd /k "cd /d %~dp0dispatcher && npm run dev -- --port 5174"

echo.
echo ============================================
echo  ✅ Всё запущено!
echo.
echo  Frontend:   http://localhost:5173
echo  Dispatcher: http://localhost:5174
echo  Backend:    http://localhost:8000
echo  API Docs:   http://localhost:8000/docs
echo ============================================
echo.
echo  Нажмите любую клавишу чтобы закрыть это окно.
echo  (Серверы продолжат работать в своих окнах)
pause >nul
