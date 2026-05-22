(function () {
    'use strict';

    const PLUGIN_NAME = 'youtube_trailer';

    // ---------- Поиск трейлеров ----------
    async function searchTrailers(title, year) {
        const apiKey = Lampa.Storage.get(PLUGIN_NAME + '_api_key', '');
        if (!apiKey) throw new Error('Введи YouTube API Key в настройках');

        const query = `${title} ${year || ''} official trailer`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || ''
            }));
        }
        throw new Error('Трейлеры не найдены');
    }

    // ---------- Воспроизведение ----------
    function playTrailer(videoId, title) {
        const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '');
        if (!proxyBase) {
            Lampa.Noty.show('Укажи адрес прокси в настройках');
            return;
        }

        const streamUrl = proxyBase.replace(/\/$/, '') + '/stream?videoId=' + videoId;

        Lampa.Player.play({
            title: `Трейлер: ${title}`,
            url: streamUrl,
            type: 'video/mp4'
        });
    }

    // ---------- Показать список трейлеров ----------
    async function showTrailerList(movie) {
        try {
            Lampa.Noty.show('Ищем трейлеры...');
            const trailers = await searchTrailers(movie.title, movie.year);
            const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '').replace(/\/$/, '');

            // Формируем элементы, используя прокси для картинок
            const items = trailers.map(t => ({
                title: t.title,
                subtitle: t.channel,
                icon: `<img src="${proxyBase}/thumbnail?videoId=${t.id}&size=mq" class="size-youtube">`,  // ← через прокси
                template: 'selectbox_icon',
                value: t.id
            }));

            Lampa.Select.show({
                title: 'Трейлеры: ' + movie.title,
                items: items,
                onSelect: (item) => {
                    playTrailer(item.value, item.title);
                }
            });

        } catch (e) {
            Lampa.Noty.show('Ошибка: ' + e.message);
            console.error(e);
        }
    }

    // ---------- Настройки ----------
    function registerSettings() {
        if (typeof Lampa === 'undefined' || !Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: 'YT трейлеры',
            icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_api_key',
                type: 'input',
                values: '',
                placeholder: 'Вставьте ключ',
                default: ''
            },
            field: {
                name: 'YouTube API Key',
                description: 'Получить в Google Cloud Console'
            }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_proxy',
                type: 'input',
                values: '',
                placeholder: 'http://150.241.94.1:3000',
                default: 'http://'
            },
            field: {
                name: 'Прокси сервер',
                description: 'Адрес вашего прокси'
            }
        });
    }

    // ---------- Кнопка ----------
    function initButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'start') return;

            setTimeout(function () {
                if ($('.button--trailer').length) return;

                const movie = e.data || {};
                const fullData = (typeof Lampa.Full !== 'undefined' && Lampa.Full.data) ? Lampa.Full.data : {};
                const card = movie.card || movie.movie || fullData.card || {};

                const title = card.title || card.name || movie.title || fullData.title || '';
                const year = card.year || movie.year || fullData.year || '';

                if (!title) return;

                var btn = $('<div>')
                    .addClass('full-start__button selector button--trailer')
                    .html(`
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/>
                        </svg>
                        <span>YT трейлеры</span>
                    `)
                    .on('hover:enter', function () { $(this).addClass('hover'); })
                    .on('hover:leave', function () { $(this).removeClass('hover'); })
                    .on('click', function () {
                        showTrailerList({ title, year });
                    });

                $('.full-start-new__buttons').append(btn);
            }, 500);
        });
    }

    // ---------- Старт ----------
    function start() {
        if (!window.Lampa || !window.Lampa.Listener) return;

        registerSettings();
        initButton();
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }

})();
root@novoe:/opt/lampac/wwwroot# nano test.js 
root@novoe:/opt/lampac/wwwroot# cat test.js 
(function () {
    'use strict';

    const PLUGIN_NAME = 'youtube_trailer';

    // ---------- Поиск трейлеров ----------
    async function searchTrailers(title, year) {
        const apiKey = Lampa.Storage.get(PLUGIN_NAME + '_api_key', '');
        if (!apiKey) throw new Error('Введи YouTube API Key в настройках');

        const query = `${title} ${year || ''} official trailer`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || ''
            }));
        }
        throw new Error('Трейлеры не найдены');
    }

    // ---------- Воспроизведение ----------
    function playTrailer(videoId, title) {
        const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '');
        const socks5 = Lampa.Storage.get(PLUGIN_NAME + '_socks5', '');
        if (!proxyBase) {
            Lampa.Noty.show('Укажи адрес прокси в настройках');
            return;
        }
        if (!socks5) {
            Lampa.Noty.show('Укажи SOCKS5 прокси в настройках');
            return;
        }

        const streamUrl = proxyBase.replace(/\/$/, '') + '/stream?videoId=' + videoId + '&socks5=' + encodeURIComponent(socks5);

        Lampa.Player.play({
            title: `Трейлер: ${title}`,
            url: streamUrl,
            type: 'video/mp4'
        });
    }

    // ---------- Показать список трейлеров ----------
    async function showTrailerList(movie) {
        try {
            Lampa.Noty.show('Ищем трейлеры...');
            const trailers = await searchTrailers(movie.title, movie.year);
            const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '').replace(/\/$/, '');
            const socks5 = Lampa.Storage.get(PLUGIN_NAME + '_socks5', '');

            const items = trailers.map(t => ({
                title: t.title,
                subtitle: t.channel,
                icon: `<img src="${proxyBase}/thumbnail?videoId=${t.id}&size=mq&socks5=${encodeURIComponent(socks5)}" class="size-youtube">`,
                template: 'selectbox_icon',
                value: t.id
            }));

            Lampa.Select.show({
                title: 'Трейлеры: ' + movie.title,
                items: items,
                onSelect: (item) => {
                    playTrailer(item.value, item.title);
                }
            });

        } catch (e) {
            Lampa.Noty.show('Ошибка: ' + e.message);
            console.error(e);
        }
    }

    // ---------- Настройки ----------
    function registerSettings() {
        if (typeof Lampa === 'undefined' || !Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: 'YT трейлеры',
            icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_api_key',
                type: 'input',
                values: '',
                placeholder: 'Вставьте ключ',
                default: ''
            },
            field: {
                name: 'YouTube API Key',
                description: 'Получить в Google Cloud Console'
            }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_proxy',
                type: 'input',
                values: '',
                placeholder: 'http://150.241.94.1:3000',
                default: 'http://'
            },
            field: {
                name: 'Прокси сервер',
                description: 'Адрес Node.js сервера'
            }
        });

        // Новое поле для SOCKS5
        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_socks5',
                type: 'input',
                values: '',
                placeholder: 'socks5://user:pass@ip:1080',
                default: ''
            },
            field: {
                name: 'SOCKS5 прокси',
                description: 'Прокси для YouTube (только локально!)'
            }
        });
    }

    // ---------- Кнопка ----------
    function initButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'start') return;

            setTimeout(function () {
                if ($('.button--trailer').length) return;

                const movie = e.data || {};
                const fullData = (typeof Lampa.Full !== 'undefined' && Lampa.Full.data) ? Lampa.Full.data : {};
                const card = movie.card || movie.movie || fullData.card || {};

                const title = card.title || card.name || movie.title || fullData.title || '';
                const year = card.year || movie.year || fullData.year || '';

                if (!title) return;

                var btn = $('<div>')
                    .addClass('full-start__button selector button--trailer')
                    .html(`
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/>
                        </svg>
                        <span>YT трейлеры</span>
                    `)
                    .on('hover:enter', function () { $(this).addClass('hover'); })
                    .on('hover:leave', function () { $(this).removeClass('hover'); })
                    .on('click', function () {
                        showTrailerList({ title, year });
                    });

                $('.full-start-new__buttons').append(btn);
            }, 500);
        });
    }

    // ---------- Старт ----------
    function start() {
        if (!window.Lampa || !window.Lampa.Listener) return;

        registerSettings();
        initButton();
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }

})();
