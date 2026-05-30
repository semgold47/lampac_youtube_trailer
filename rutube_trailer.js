(function () {
    'use strict';

    const PLUGIN_NAME = 'rutube_trailer';
    const QUALITY_LIST = ['auto', '2160p', '1440p', '1080p', '720p', '480p', '360p'];

    // ---------- Поиск трейлеров на Rutube через прокси ----------
    async function fetchTrailers(title, year) {
        const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '');
        if (!proxyBase) throw new Error('Укажи адрес прокси в настройках');

        const query = `${title} ${year || ''} трейлер`;
        const url = proxyBase.replace(/\/$/, '') + '/rutube-search?q=' + encodeURIComponent(query);

        const res = await fetch(url);
        if (!res.ok) throw new Error('Ошибка поиска');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
        throw new Error('Трейлеры не найдены');
    }

    // ---------- Показать список трейлеров ----------
    function showTrailerList(title, trailers, proxyBase, quality) {
        const playlist = trailers.map(t => ({
            title: t.title,
            subtitle: t.channel,
            url: `${proxyBase}/rutube-stream?videoId=${t.id}&quality=${encodeURIComponent(quality)}`,
            icon: `<img src="${proxyBase}/rutube-thumbnail?url=${encodeURIComponent(t.thumbnail)}" class="size-youtube">`,
            template: 'selectbox_icon',
            type: 'hls', 
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
            name: 'Rutube трейлеры',
            icon: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="2" width="20" height="20" rx="3" stroke="white" stroke-width="2" fill="none"/><path fill="white" d="M9 8v8l7-4z"/></svg>'
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
            field: { name: 'Прокси сервер', description: 'Адрес Node.js сервера' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_quality',
                type: 'select',
                values: QUALITY_LIST,
                default: 'auto'
            },
            field: { name: 'Качество видео', description: 'Максимальное разрешение трейлера' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_NAME,
            param: {
                name: PLUGIN_NAME + '_position',
                type: 'select',
                values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                default: '2'
            },
            field: { name: 'После кнопки №', description: 'Вставить Rutube после указанной кнопки' }
        });
    }

    // ---------- Создание кнопки ----------
    function initButton() {
        function createButton(movie) {
            const fullData = (typeof Lampa.Full !== 'undefined' && Lampa.Full.data) ? Lampa.Full.data : {};
            const card = movie.card || movie.movie || fullData.card || {};
            const title = card.title || card.name || movie.title || fullData.title || '';
            const year = card.year || movie.year || fullData.year || '';
            if (!title) return null;

            let isLoading = false;

            async function openList() {
                if (isLoading) return;
                isLoading = true;
                try {
                    Lampa.Noty.show('Ищем трейлеры на Rutube...');
                    const trailers = await fetchTrailers(title, year);
                    const proxyBase = Lampa.Storage.get(PLUGIN_NAME + '_proxy', '').replace(/\/$/, '');

                    let qualitySaved = Lampa.Storage.get(PLUGIN_NAME + '_quality', '');
                    let quality = qualitySaved;
                    if (!isNaN(parseInt(qualitySaved))) {
                        quality = QUALITY_LIST[parseInt(qualitySaved)] || 'auto';
                    } else if (!qualitySaved) {
                        quality = 'auto';
                    }

                    showTrailerList(title, trailers, proxyBase, quality);
                } catch (e) {
                    console.error(e);
                    Lampa.Noty.show('Ошибка: ' + e.message);
                } finally {
                    isLoading = false;
                }
            }

            return {
                title: 'Ru трейлеры',
                subtitle: 'Rutube',
                icon: `
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
                        <path fill="currentColor" d="M9 8v8l7-4z"/>
                    </svg>`,
                template: 'button',
                onEnter: openList
            };
        }

        Lampa.Listener.follow('full', function (event) {
            if (event.type !== 'complite') return;

            setTimeout(function () {
                const buttons = $('.full-start-new__buttons');
                if (!buttons.length) return;
                if (buttons.find('.button--rutube-trailer').length) return;

                const buttonData = createButton(event.data || {});
                if (!buttonData) return;

                const button = $(`
                    <div class="full-start__button selector button--rutube-trailer">
                        ${buttonData.icon}
                        <span>${buttonData.title}</span>
                    </div>
                `);

                button.on('hover:enter', function () {
                    $(this).addClass('hover');
                    buttonData.onEnter();
                });

                // Вставка на нужную позицию или в конец
                const position = parseInt(Lampa.Storage.get(PLUGIN_NAME + '_position', '2'));
                const allButtons = buttons.children('.full-start__button');
                if (allButtons.length >= position) {
                    button.insertAfter(allButtons.eq(position - 1));
                } else {
                    buttons.append(button);
                }

                Lampa.Controller.collectionSet(buttons);

                const defaultBtn = buttons.find('.button--priority');
                if (defaultBtn.length) {
                    Lampa.Controller.collectionFocus(defaultBtn[0]);
                }
            }, 0);
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
