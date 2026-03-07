@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════╗
echo ║    🔍 CoolCare — Проверка перед деплоем      ║
echo ╚══════════════════════════════════════════════╝
echo.

set PASS=0
set FAIL=0
set TOTAL=0

:: ═══════════════════════════════════════
:: 1. Backend: pytest
:: ═══════════════════════════════════════
echo ┌─────────────────────────────────────┐
echo │  1/3  Backend тесты (pytest)        │
echo └─────────────────────────────────────┘
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo ⚠️  venv не найден, создаю...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt >nul 2>&1
) else (
    call venv\Scripts\activate.bat
)

python -m pytest tests/ -v --tb=short 2>&1
if errorlevel 1 (
    echo.
    echo ❌ BACKEND ТЕСТЫ: ПРОВАЛЕНЫ
    set /a FAIL+=1
) else (
    echo.
    echo ✅ BACKEND ТЕСТЫ: ПРОЙДЕНЫ
    set /a PASS+=1
)
set /a TOTAL+=1

call deactivate 2>nul
cd /d "%~dp0"

echo.

:: ═══════════════════════════════════════
:: 2. Frontend: build check
:: ═══════════════════════════════════════
echo ┌─────────────────────────────────────┐
echo │  2/3  Frontend сборка               │
echo └─────────────────────────────────────┘
echo.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo 📦 Устанавливаю зависимости...
    call npm install >nul 2>&1
)

call npm run build >nul 2>&1
if errorlevel 1 (
    echo ❌ FRONTEND СБОРКА: ОШИБКА
    set /a FAIL+=1
) else (
    echo ✅ FRONTEND СБОРКА: УСПЕШНО
    set /a PASS+=1
)
set /a TOTAL+=1

cd /d "%~dp0"

echo.

:: ═══════════════════════════════════════
:: 3. Dispatcher: build check
:: ═══════════════════════════════════════
echo ┌─────────────────────────────────────┐
echo │  3/3  Dispatcher сборка             │
echo └─────────────────────────────────────┘
echo.

cd /d "%~dp0dispatcher"

if not exist "node_modules" (
    echo 📦 Устанавливаю зависимости...
    call npm install >nul 2>&1
)

call npm run build >nul 2>&1
if errorlevel 1 (
    echo ❌ DISPATCHER СБОРКА: ОШИБКА
    set /a FAIL+=1
) else (
    echo ✅ DISPATCHER СБОРКА: УСПЕШНО
    set /a PASS+=1
)
set /a TOTAL+=1

cd /d "%~dp0"

:: ═══════════════════════════════════════
:: Итоги
:: ═══════════════════════════════════════
echo.
echo ╔══════════════════════════════════════════════╗
echo ║               📊 ИТОГИ                       ║
echo ╠══════════════════════════════════════════════╣
echo ║  Пройдено: %PASS% / %TOTAL%                            ║
echo ║  Провалено: %FAIL%                                  ║
echo ╚══════════════════════════════════════════════╝
echo.

if %FAIL% GTR 0 (
    echo 🚫 ДЕПЛОЙ НЕ РЕКОМЕНДУЕТСЯ — исправьте ошибки выше!
    echo.
    pause
    exit /b 1
) else (
    echo 🎉 ВСЁ ЧИСТО! Можно деплоить: git push ^&^& ssh root@82.97.243.212 "cd /var/www/coolcare ^&^& bash deploy.sh"
    echo.
    pause
    exit /b 0
)
