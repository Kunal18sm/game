
        const routes = {
            home: 'home.html',
            level1: 'level1.html',
            level2: 'level2.html'
        };

        const frame = document.getElementById('gameFrame');

        function resolvePageFromQuery() {
            const params = new URLSearchParams(window.location.search);
            const page = params.get('page');
            if (page && routes[page]) return page;
            return 'home';
        }

        function navigate(pageKey, pushHistory = true) {
            if (!routes[pageKey]) pageKey = 'home';
            const target = routes[pageKey];
            if (!frame.src || !frame.src.endsWith('/' + target)) {
                frame.src = target;
            }
            if (pushHistory) {
                const url = pageKey === 'home' ? 'index.html' : `index.html?page=${encodeURIComponent(pageKey)}`;
                history.replaceState({ page: pageKey }, '', url);
            }
        }

        function isFullscreenActive() {
            return Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        }

        async function requestFullscreenAndLandscape() {
            if (!isFullscreenActive()) {
                const root = document.documentElement;
                try {
                    if (root.requestFullscreen) {
                        await root.requestFullscreen();
                    } else if (root.webkitRequestFullscreen) {
                        root.webkitRequestFullscreen();
                    } else if (root.msRequestFullscreen) {
                        root.msRequestFullscreen();
                    }
                } catch (_) {
                    return;
                }
            }

            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }

        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'missiongame:navigate') {
                navigate(data.page || 'home');
            }

            if (data.type === 'missiongame:request-fullscreen') {
                requestFullscreenAndLandscape();
            }
        });

        window.addEventListener('pointerdown', requestFullscreenAndLandscape, { passive: true });

        navigate(resolvePageFromQuery(), false);
    
