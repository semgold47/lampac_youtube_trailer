#!/bin/bash
# Установщик YT Trailer Proxy + плагин Lampa
# Для Ubuntu/Debian. Запускать от root: sudo bash install.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  YT Trailer Proxy + Lampa Plugin Setup  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. Проверка root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Пожалуйста, запустите скрипт от root (sudo bash install.sh)${NC}"
    exit 1
fi

# 2. Запрос SOCKS5 прокси
echo -e "${YELLOW}Введите ваш SOCKS5 прокси (например socks5://user:pass@ip:port):${NC}"
read -p "SOCKS5: " SOCKS5
if [ -z "$SOCKS5" ]; then
    echo -e "${RED}Ошибка: SOCKS5 прокси обязателен. Выход.${NC}"
    exit 1
fi

# 3. Установка Node.js 20.x
echo -e "${GREEN}[1/6] Устанавливаем Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}Node.js: $(node -v)${NC}"

# 4. Установка yt-dlp
echo -e "${GREEN}[2/6] Устанавливаем yt-dlp...${NC}"
if ! command -v yt-dlp &> /dev/null; then
    wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
    chmod a+rx /usr/local/bin/yt-dlp
fi
echo -e "${GREEN}yt-dlp: $(yt-dlp --version)${NC}"

# 5. Установка pm2
echo -e "${GREEN}[3/6] Устанавливаем pm2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 6. Создание директории и установка зависимостей
echo -e "${GREEN}[4/6] Настройка сервера...${NC}"
PROJECT_DIR="/opt/yt-proxy"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Если репозиторий уже склонирован, обновим; иначе скачаем server.js из вашего репо
if [ -d ".git" ]; then
    git pull
else
    # Предположим, что файлы в репозитории уже здесь? Или скачаем напрямую
    wget -q https://raw.githubusercontent.com/semgold47/lampac_youtube_trailer/main/server.js -O server.js
fi

# Запишем SOCKS5 в .env для сервера
echo "SOCKS_PROXY_URL=$SOCKS5" > .env

# Установка npm модулей
if [ ! -d "node_modules" ]; then
    npm init -y &> /dev/null
fi
npm install express socks-proxy-agent &> /dev/null

# 7. Запуск сервера через pm2
echo -e "${GREEN}[5/6] Запускаем прокси-сервер...${NC}"
pm2 delete yt-proxy &> /dev/null || true
pm2 start server.js --name yt-proxy
pm2 save
pm2 startup systemd &> /dev/null || true

# 8. Размещение плагина в /opt/lampac/wwwroot/
echo -e "${GREEN}[6/6] Копируем плагин в /opt/lampac/wwwroot/...${NC}"
mkdir -p /opt/lampac/wwwroot/
wget -q https://raw.githubusercontent.com/semgold47/lampac_youtube_trailer/main/youtube_trailer.js -O /opt/lampac/wwwroot/youtube_trailer.js

# Получение внешнего IP (если доступен)
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="ВАШ_IP"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}         Установка завершена!           ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Сервер запущен на порту 3000 (через pm2)."
echo -e "Проверьте: http://${SERVER_IP}:3000/"
echo ""
echo -e "Плагин Lampa доступен по адресу:"
echo -e "${YELLOW}http://${SERVER_IP}/youtube_trailer.js${NC}"
echo -e "(если у вас настроен веб-сервер на /opt/lampac/wwwroot/)"
echo ""
echo -e "Добавьте плагин в Lampa:"
echo -e "   Настройки → Расширения → Добавить плагин"
echo -e "   Вставьте URL плагина (при необходимости измените IP/домен):"
echo -e "   ${YELLOW}http://${SERVER_IP}/youtube_trailer.js${NC}"
echo ""
echo -e "После добавления зайдите в Настройки → YT трейлеры и укажите:"
echo -e "   - Прокси сервер: http://${SERVER_IP}:3000"
echo -e "   - Качество видео (выбрать из списка)"
echo ""
echo -e "Готово!"
