#!/bin/bash
# Установщик YT Trailer Proxy + плагины Lampa (YouTube и Rutube)
# Для Ubuntu/Debian. Запускать от root: sudo bash install.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
echo -e "${GREEN}[1/7] Устанавливаем Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}Node.js: $(node -v)${NC}"

# 4. Установка yt-dlp
echo -e "${GREEN}[2/7] Устанавливаем yt-dlp...${NC}"
if ! command -v yt-dlp &> /dev/null; then
    wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
    chmod a+rx /usr/local/bin/yt-dlp
fi
echo -e "${GREEN}yt-dlp: $(yt-dlp --version)${NC}"

# 5. Установка pm2
echo -e "${GREEN}[3/7] Устанавливаем pm2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 6. Создание папки проекта и загрузка файлов из репозитория
echo -e "${GREEN}[4/7] Настройка сервера...${NC}"
PROJECT_DIR="/opt/lampac_youtube_trailer"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Скачиваем актуальные файлы
wget -q https://raw.githubusercontent.com/semgold47/lampac_youtube_trailer/main/server.js -O server.js
wget -q https://raw.githubusercontent.com/semgold47/lampac_youtube_trailer/main/youtube_trailer.js -O youtube_trailer.js
wget -q https://raw.githubusercontent.com/semgold47/lampac_youtube_trailer/main/rutube_trailer.js -O rutube_trailer.js

# Установка npm-зависимостей (express, socks-proxy-agent, dotenv)
if [ ! -f "package.json" ]; then
    npm init -y &> /dev/null
fi
npm install express socks-proxy-agent dotenv &> /dev/null

# Создаём .env с SOCKS5
echo "SOCKS_PROXY_URL=$SOCKS5" > .env

# 7. Запуск сервера через pm2
echo -e "${GREEN}[5/7] Запускаем прокси-сервер...${NC}"
pm2 delete lampac_youtube_trailer &> /dev/null || true
pm2 start server.js --name lampac_youtube_trailer
pm2 save
pm2 startup systemd &> /dev/null || true

# 8. Размещение плагинов в /opt/lampac/wwwroot/
echo -e "${GREEN}[6/7] Копируем плагины в /opt/lampac/wwwroot/...${NC}"
mkdir -p /opt/lampac/wwwroot/
cp youtube_trailer.js /opt/lampac/wwwroot/youtube_trailer.js
cp rutube_trailer.js /opt/lampac/wwwroot/rutube_trailer.js

# Получаем IP сервера
SERVER_IP=$(hostname -I | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP="ВАШ_IP"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}         Установка завершена!           ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Сервер запущен на порту 3000 (через pm2)."
echo -e "Проверьте: http://${SERVER_IP}:3000/"
echo ""
echo -e "Плагины Lampa доступны по адресам:"
echo -e "${YELLOW}http://${SERVER_IP}/youtube_trailer.js${NC}"
echo -e "${YELLOW}http://${SERVER_IP}/rutube_trailer.js${NC}"
echo -e "(если у вас настроен веб-сервер на /opt/lampac/wwwroot/)"
echo ""
echo -e "Добавьте плагины в Lampa:"
echo -e "   Настройки → Расширения → Добавить плагин"
echo -e "   Вставьте URL нужного плагина (при необходимости измените IP/домен):"
echo -e "   ${YELLOW}http://${SERVER_IP}/youtube_trailer.js${NC}"
echo -e "   ${YELLOW}http://${SERVER_IP}/rutube_trailer.js${NC}"
echo ""
echo -e "После добавления зайдите в Настройки плагина и укажите:"
echo -e "   - Прокси сервер: http://${SERVER_IP}:3000"
echo -e "   - Качество видео (выбрать из списка)"
echo -e "   - Для Rutube: позицию кнопки (после какой кнопки вставить)"
echo ""
echo -e "SOCKS5 спрятан в /opt/lampac_youtube_trailer/.env и не виден клиенту."
echo -e "Готово!"
