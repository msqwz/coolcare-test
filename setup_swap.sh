#!/bin/bash
# Скрипт для проверки и создания Swap-файла (для слабых VPS)

echo "📊 Проверка памяти..."
free -h

# Проверяем, есть ли уже swap
SWAP_EXISTS=$(swapon --show | wc -l)

if [ "$SWAP_EXISTS" -gt 1 ]; then
    echo "✅ Swap уже настроен."
else
    echo "⚠️ Swap не обнаружен. Начинаю создание (2GB)..."
    
    # Создаем файл подкачки на 2ГБ
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # Добавляем в fstab, чтобы сохранялось после перезагрузки
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    
    echo "✅ Swap на 2GB успешно создан и подключен!"
    free -h
fi
