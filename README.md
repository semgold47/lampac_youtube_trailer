<div align="center">

# 🎬 YT Trailer for Lampa (SOCKS5)

**Плагин для Lampa**, который добавляет кнопку **«YT трейлеры»** и позволяет смотреть трейлеры с YouTube через ваш **SOCKS5-прокси**.

**Всё работает через `yt-dlp`.** 

![Version](https://img.shields.io/badge/Version-1.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

## ✨ Возможности

- 🔍 **Автоматический поиск** до 10 трейлеров по названию и году
- 🖼️ Проксирование миниатюр через ваш сервер
- ▶️ **Потоковое воспроизведение** (без скачивания)
- ⚙️ Выбор качества: `auto`, 2160p, 1440p, 1080p, 720p, 480p, 360p

## 🛠 Требования

### Сервер (VPS / домашний сервер)
- Ubuntu/Debian (рекомендуется) или любой Linux
- **Node.js** ≥ 18
- **npm**
- **yt-dlp**
- **pm2** (опционально, для удобства)

### Клиент
- Lampa

### Сервер
- Lampac 😁

---

## 🚀 Быстрая установка

```bash
git clone https://github.com/semgold47/lampac_youtube_trailer.git
cd lampac_youtube_trailer
sudo bash install.sh
```

Скрипт автоматически установит все зависимости, спросит данные SOCKS5-прокси и запустит сервер.

---

## 📋 Ручная установка сервера

### 1. Установка зависимостей

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# yt-dlp
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 2. Установка проекта

```bash
git clone https://github.com/semgold47/lampac_youtube_trailer.git
cd lampac_youtube_trailer
npm install
```

### 3. Настройка SOCKS5

Создайте файл `.env`:

```env
SOCKS_PROXY_URL=socks5://login:password@ip:port
```

### 4. Запуск

```bash
# Обычный запуск
node server.js

# Через pm2 (рекомендуется)
pm2 start server.js --name yt-trailer
```

---

## 📱 Установка плагина в Lampa

1. Скопируйте файл `youtube_trailer.js` на веб-сервер (например, в папку Lampac).
2. В Lampa перейдите: **Настройки → Расширения → Добавить плагин**.
3. Вставьте прямую ссылку на файл (например: `http://ваш_ip/youtube_trailer.js`).
4. Перейдите в **Настройки → YT трейлеры** и укажите:
   - Адрес вашего сервера (по умолчанию `http://ваш_ip:3000`)
   - Предпочитаемое качество видео

---

## 🎯 Как использовать

1. Откройте карточку фильма или сериала.
2. Нажмите кнопку **«YT трейлеры»**.
3. Выберите нужный трейлер из списка.
4. Наслаждайтесь просмотром через ваш SOCKS5-прокси.

---

## 🔧 Как это работает

1. Плагин отправляет название и год фильма на ваш сервер.
2. Сервер ищет трейлеры через `yt-dlp` (`ytsearch10:`).
3. При воспроизведении сервер транслирует поток видео через SOCKS5.
4. Миниатюры также проксируются через сервер.

---

## 🔐 Безопасность

- Логин и пароль от SOCKS5 **никогда не покидают сервер**.
- Нет хранения видео или миниатюр — только потоковая передача.

---

## 📄 Лицензия

**MIT License** — делайте с кодом всё что угодно.

---

## ❤️ Благодарности

Вдохновлено плагинами (https://plugin.rootu.top/rutube.js) и (https://plugin.rootu.top/trailers.js) для Lampa. А точнее, их плохой работой у меня без SOCKS5, а раз уж всё равно использовать прокси, почему бы не сразу с YouTube 😁

---

**Автор:** semgold47

</div>
