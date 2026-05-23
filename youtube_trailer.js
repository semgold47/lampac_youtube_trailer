(function () {
    'use strict';

    const PLUGIN_NAME = 'youtube_trailer';

    // ---------- Поиск трейлеров через сервер ----------
    async function fetchTrailers(title, year) {
        const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '');
        if (!proxyBase) throw new Error('Укажи адрес прокси в настройках');

        const query = `${title} ${year || ''} trailer`;
        const url = proxyBase.replace(/\/$/, '') + '/search?q=' + encodeURIComponent(query);

        const res = await fetch(url);
        if (!res.ok) throw new Error('Ошибка поиска');
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
        throw new Error('Трейлеры не найдены');
    }

    // ---------- Показать список трейлеров ----------
    function showTrailerList(title, trailers, proxyBase, quality) {
        const playlist = trailers.map(t => ({
            title: t.title,
            subtitle: t.channel,
            url: proxyBase + '/stream?videoId=' + t.id + '&quality=' + encodeURIComponent(quality),
            icon: `<img src="${proxyBase}/thumbnail?videoId=${t.id}&size=mq" class="size-youtube">`,
            template: 'selectbox_icon',
            iptv: true
        }));

        Lampa.Select.show({
            title: 'Трейлеры: ' + title,
            items: playlist,
            onSelect: function (selected) {
                Lampa.Player.play(selected);
                Lampa.Player.playlist(playlist);
            },
            onBack: function () {
                Lampa.Controller.toggle('full_start');
            }
        });
    }

    // ---------- Настройки ----------
    function registerSettings() {
        if (typeof Lampa === 'undefined' || !Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_NAME,
            name: 'YT трейлеры',
            icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="white" d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/></svg>',
        });
        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_proxy',
                type: 'input',
                values: '',
                placeholder: 'http://155.55.55.5:3000',
                default: 'http://'
            },
            field: {
                name: 'Прокси сервер',
                description: 'Адрес Node.js сервера'
            }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_quality',
                type: 'select',
                values: ['auto', '2160p', '1440p', '1080p', '720p', '480p', '360p'],
                default: 'auto'
            },
            field: {
                name: 'Качество видео',
                description: 'Максимальное разрешение трейлера'
            }
        });
    }

    // ---------- Создание кнопки ----------
    function initButton() {
        Lampa.Listener.follow('full', function (event) {
            if (event.type !== 'start') return;

            setTimeout(function () {
                if ($('.button--trailer').length) return;

                const movie = event.data || {};
                const fullData = (typeof Lampa.Full !== 'undefined' && Lampa.Full.data) ? Lampa.Full.data : {};
                const card = movie.card || movie.movie || fullData.card || {};

                const title = card.title || card.name || movie.title || fullData.title || '';
                const year = card.year || movie.year || fullData.year || '';

                if (!title) return;

                // Кнопка с оригинальным SVG (currentColor) – БЕЗ изменений
                var btn = $('<div>')
                    .addClass('full-start__button selector button--trailer')
                    .html(`
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/>
                        </svg>
                        <span>YT трейлеры</span>
                    `);

                const isTV = Lampa.Platform && Lampa.Platform.screen && Lampa.Platform.screen('tv');
                let isLoading = false;

                async function openList() {
                    if (isLoading) return;
                    isLoading = true;
                    try {
                        Lampa.Noty.show('Ищем трейлеры...');
                        const trailers = await fetchTrailers(title, year);
                        const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '').replace(/\/$/, '');
                        const qualityList = ['auto', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
                        let qualitySaved = Lampa.Storage.get(PLUGIN_NAME + '_quality', '');
                        let quality = qualitySaved;
                        if (!isNaN(parseInt(qualitySaved))) {
                            quality = qualityList[parseInt(qualitySaved)] || 'auto';
                        } else if (!qualitySaved) {
                            quality = 'auto';
                        }
                        showTrailerList(title, trailers, proxyBase, quality);
                    } catch (e) {
                        Lampa.Noty.show('Ошибка: ' + e.message);
                        console.error(e);
                    } finally {
                        isLoading = false;
                    }
                }

                // ВАЖНО: добавляем и hover, и focus для правильной инверсии цвета
                if (isTV) {
                    btn.on('hover:enter', function () {
                        $(this).addClass('hover focus');
                        openList();
                    });
                } else {
                    btn.on('hover:enter', function () { $(this).addClass('hover focus'); });
                    btn.on('hover:leave', function () { $(this).removeClass('hover focus'); });
                    btn.on('click', openList);
                }

                $('.full-start-new__buttons').append(btn);
            }, 500);
        });
    }

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
