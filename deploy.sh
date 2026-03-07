#!/bin/bash
set -e  # Останавливать скрипт при критических ошибках

echo "🚀 Начало обновления CoolCare..."
cd /var/www/coolcare

# === Настройки ===
VENV_PATH="/var/www/coolcare/venv"
PYTHON="$VENV_PATH/bin/python"
PIP="$VENV_PATH/bin/pip"
APP_DIR="backend"
APP_ENTRY="main.py"
LOG_DIR="/var/www/coolcare/logs"
LOG_FILE="$LOG_DIR/app.log"
DEPLOY_LOG="$LOG_DIR/deploy.log"
PID_FILE="/var/www/coolcare/app.pid"

# Создаём директорию для логов
mkdir -p "$LOG_DIR"

# Логирование: вывод и в файл одновременно
exec > >(tee -a "$DEPLOY_LOG") 2>&1

echo "========================================="
echo "🚀 Начало обновления CoolCare: $(date)"
echo "========================================="

# === Функция остановки приложения ===
stop_app() {
    echo "⏹️  Остановка старого процесса..."
    
    # Остановка по PID-файлу
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo "   📍 Остановка процесса $OLD_PID..."
            kill "$OLD_PID" 2>/dev/null || true
            sleep 2
            kill -9 "$OLD_PID" 2>/dev/null || true
            echo "   ✅ Процесс $OLD_PID остановлен"
        fi
        rm -f "$PID_FILE"
    fi
    
    # Дублирующая проверка по имени процесса
    pkill -f "python.*$APP_ENTRY" 2>/dev/null || true
    pkill -f "uvicorn.*$APP_DIR" 2>/dev/null || true
    sleep 1
    echo "✅ Все процессы остановлены"
}

# === 1. Остановить приложение ===
stop_app

# === 2. Проверка .env файлов ===
echo "🔐 Проверка конфигурации..."

# Backend .env
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        echo "⚠️  $APP_DIR/.env не найден! Копируем из .env.example..."
        cp "$APP_DIR/.env.example" "$APP_DIR/.env"
        echo "❗ Отредактируйте $APP_DIR/.env и вставьте ключи Supabase!"
        echo "   Требуется: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET"
        exit 1
    else
        echo "❌ .env и .env.example не найдены в $APP_DIR!"
        exit 1
    fi
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        echo "⚠️  frontend/.env не найден! Копируем из .env.example..."
        cp frontend/.env.example frontend/.env
        echo "❗ Проверьте frontend/.env (особенно VITE_API_URL)!"
    fi
fi

# Dispatcher .env
if [ ! -f "dispatcher/.env" ]; then
    if [ -f "dispatcher/.env.example" ]; then
        echo "⚠️  dispatcher/.env не найден! Копируем из .env.example..."
        cp dispatcher/.env.example dispatcher/.env
        echo "❗ Проверьте dispatcher/.env!"
    fi
fi

# === 3. Обработать локальные изменения перед pull ===
echo "🔍 Проверка локальных изменений..."

# Игнорируем артефакты сборки
git checkout -- frontend/dist/ 2>/dev/null || true
git clean -fd frontend/dist/ 2>/dev/null || true

# Проверяем наличие изменений
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "⚠️  Найдены незакоммиченные изменения!"
    echo "📦 Сохраняем в stash..."
    git stash push -m "Auto-stash before deploy $(date +%Y%m%d_%H%M%S)" -u 2>/dev/null || true
    STASHED=1
else
    echo "✅ Локальная история чиста"
    STASHED=0
fi

# === 4. Обновить код из GitHub ===
echo "📥 Получение изменений с GitHub..."
git pull origin main

# === 5. Проверка/создание виртуального окружения ===
echo "🐍 Проверка виртуального окружения..."
if [ ! -f "$PYTHON" ]; then
    echo "📦 Создаём новое venv..."
    if ! python3 -m venv "$VENV_PATH"; then
        echo "❌ Ошибка создания venv! Установите: apt install python3-venv"
        exit 1
    fi
fi

# === 6. Установка Python зависимостей ===
echo "📦 Установка Python зависимостей..."
"$PIP" install --upgrade pip --quiet 2>/dev/null || true
if ! "$PIP" install -r "$APP_DIR/requirements.txt" --quiet 2>/dev/null; then
    echo "⚠️  Предупреждение: некоторые пакеты не установились"
    # Не останавливаем деплой, пробуем продолжить
fi

# === 7. Сборка фронтенда ===
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo "🔨 Сборка фронтенда..."
    
    # === Проверка версии Node.js ===
echo "🔍 Проверка Node.js..."
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Требуется Node.js >= 20, у вас: $(node -v)"
    echo "   Обновите: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && apt install -y nodejs"
    # Не останавливаем деплой, но предупреждаем
fi
    # Проверка npm
    if ! command -v npm &> /dev/null; then
        echo "❌ Ошибка: npm не установлен! Установите Node.js"
        exit 1
    fi
    
    cd frontend
    
    echo "📥 Установка npm пакетов..."
    if ! npm install --silent 2>/dev/null; then
        echo "⚠️  npm install завершился с предупреждениями, продолжаем..."
    fi
    
    echo "🏗️  Сборка проекта..."
    if ! npm run build; then
        echo "❌ Ошибка сборки фронтенда!"
        exit 1
    fi
    
    # Копируем Service Worker если есть
    [ -f "src/sw.js" ] && cp src/sw.js dist/ 2>/dev/null || true
    echo "✅ Фронтенд успешно собран"
    cd ..
    
    echo "🔨 Сборка Диспетчерской..."
    cd dispatcher
    
    # Ограничиваем использование памяти для слабых VPS
    export NODE_OPTIONS="--max-old-space-size=512"
    
    echo "   📦 Установка зависимостей диспетчерской..."
    if ! npm install --no-audit --no-fund --loglevel info; then
        echo "⚠️  npm install в dispatcher завершился с ошибкой или прерван (OOM?)"
    fi
    
    echo "   🏗️  Запуск vite build..."
    if ! npm run build; then
        echo "❌ Ошибка сборки Диспетчерской! (Vite не найден или не хватило памяти)"
        exit 1
    fi
    echo "✅ Диспетчерская успешно собрана"
    cd ..
else
    echo "⚠️  Файлы фронтенда или диспетчерской не найдены, пропускаем сборку"
fi

# === 8.5 Настройка Nginx (Reverse Proxy) ===
echo "🌐 Настройка Nginx..."
NGINX_CONF_AVAILABLE="/etc/nginx/sites-available/coolcare"
NGINX_CONF_ENABLED="/etc/nginx/sites-enabled/coolcare"
NGINX_DEFAULT_ENABLED="/etc/nginx/sites-enabled/default"

# Копируем и активируем конфиг
if [ -f "nginx/coolcare.conf" ]; then
    sudo ln -sf "$(pwd)/nginx/coolcare.conf" "$NGINX_CONF_AVAILABLE"
    sudo ln -sf "$NGINX_CONF_AVAILABLE" "$NGINX_CONF_ENABLED"
    
    # Отключаем стандартный конфиг Nginx
    if [ -L "$NGINX_DEFAULT_ENABLED" ] || [ -f "$NGINX_DEFAULT_ENABLED" ]; then
        echo "   🗑️  Отключение стандартного конфига Nginx (default)..."
        sudo rm "$NGINX_DEFAULT_ENABLED"
    fi
    
    # Проверка и перезагрузка
    if sudo nginx -t &> /dev/null; then
        echo "   🔄 Перезагрузка Nginx..."
        sudo systemctl reload nginx || sudo systemctl restart nginx
        echo "   ✅ Nginx настроен на порт 80"
    else
        echo "   ❌ Ошибка в конфигурации Nginx! Проверьте nginx/coolcare.conf"
        sudo nginx -t
    fi
else
    echo "   ⚠️  Файл nginx/coolcare.conf не найден, пропускаем настройку Nginx"
fi

# === 8. Вернуть stash-енные изменения (если были) ===
if [ "$STASHED" -eq 1 ]; then
    echo "🔄 Восстановление локальных изменений..."
    if ! git stash pop 2>/dev/null; then
        echo "⚠️  Конфликт при восстановлении stash — разрешите вручную"
        echo "   Запустите 'git status' для просмотра конфликтов"
        git stash drop 2>/dev/null || true
    fi
fi

# === 9. Запуск приложения ===
echo "🚀 Запуск приложения..."
cd "$APP_DIR"

# Запускаем в фоне с логированием
nohup "$PYTHON" "$APP_ENTRY" > "$LOG_FILE" 2>&1 &
APP_PID=$!
echo $APP_PID > "$PID_FILE"

# Ждём запуска и проверяем
sleep 3
if kill -0 "$APP_PID" 2>/dev/null; then
    echo "✅ Приложение запущено (PID: $APP_PID)"
else
    echo "❌ Процесс не запустился! Проверьте логи:"
    tail -n 50 "$LOG_FILE"
    exit 1
fi

# === 10. Финальные сообщения ===
echo ""
echo "========================================="
echo "✅ Обновление CoolCare завершено!"
echo "📊 Логи приложения: tail -f $LOG_FILE"
echo "📊 Логи деплоя:     tail -f $DEPLOY_LOG"
echo "🔍 Процесс:         ps aux | grep $APP_ENTRY"
echo "🌐 URL:             http://82.97.243.212"
echo "🩺 Health:          curl http://82.97.243.212/health"
echo "========================================="

# === Авто-коммит изменений на сервере (опционально) ===
echo ""
echo "💾 Сохранение изменений в Git..."
cd /var/www/coolcare

# Проверяем наличие изменений БЕЗ set -e
set +e  # Временно отключаем выход при ошибке
GIT_DIFF=$(git diff-index --quiet HEAD -- 2>/dev/null; echo $?)
set -e   # Возвращаем set -e

if [ "$GIT_DIFF" != "0" ]; then
    echo "📝 Найдены изменения, коммитим..."
    git add -A 2>/dev/null || true
    
    # Коммит с подавлением ошибки "nothing to commit"
    COMMIT_RESULT=$(git commit -m "auto: deploy $(date +%Y%m%d_%H%M%S)" 2>&1)
    COMMIT_CODE=$?
    
    if [ $COMMIT_CODE -eq 0 ]; then
        echo "✅ Коммит создан"
        # Push с игнорированием "already up to date"
        git push origin main 2>&1 | grep -qv "already up to date\|Everything up-to-date" && \
            echo "✅ Changes pushed to GitHub" || \
            echo "ℹ️  Репозиторий уже актуален"
    else
        # Игнорируем "nothing to commit" как нормальную ситуацию
        if echo "$COMMIT_RESULT" | grep -q "nothing to commit"; then
            echo "ℹ️  Изменений для коммита нет"
        else
            echo "⚠️  Коммит не создан: $COMMIT_RESULT"
        fi
    fi
else
    echo "✅ Working tree clean — коммит не требуется"
fi

# === Явный успешный выход для CI/CD ===
echo ""
echo "🎉 Деплой завершён успешно!"
exit 0