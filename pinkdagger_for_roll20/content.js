(function () {
    'use strict';

    if (window.__daggerheart_tab_initialized) return;
    window.__daggerheart_tab_initialized = true;

    function injectStyles(doc) {
        if (doc.getElementById('daggerheart-custom-css')) return;
        const linkEl = doc.createElement('link');
        linkEl.id = 'daggerheart-custom-css';
        linkEl.rel = 'stylesheet';
        linkEl.type = 'text/css';
        linkEl.href = chrome.runtime.getURL('styles.css');
        doc.head.appendChild(linkEl);
    }

    // A aba "Atributos e Habilidades" só existe para quem pode editar a ficha.
    // O data-tab é interno do Roll20 e não muda com o idioma da interface.
    function hasAttributesTab(navTabs) {
        const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
        if (!attrTabNav) return false;
        const navItem = attrTabNav.closest('li') || attrTabNav;
        return navItem.style.display !== 'none';
    }

    function initDaggerheartTab(doc) {
        const navTabs = doc.querySelector('.nav.nav-tabs');
        const tabContent = doc.querySelector('#tab-content');

        if (!navTabs || !tabContent) return;

        if (!hasAttributesTab(navTabs)) {
            // Remove a aba caso a permissão de edição tenha sido retirada
            doc.querySelector('.daggerheart-nav-item')?.remove();
            tabContent.querySelector('.daggerheart.tab-pane')?.remove();
            return;
        }

        if (doc.querySelector('.daggerheart-nav-item')) return;

        injectStyles(doc);

        const daggerheartNavItem = doc.createElement('li');
        daggerheartNavItem.className = 'daggerheart-nav-item';
        daggerheartNavItem.innerHTML = `<a href="javascript:void(0);" data-tab="daggerheart" style="color: #E85D9E; font-weight: bold;">PinkDagger</a>`;
        navTabs.appendChild(daggerheartNavItem);

        const daggerheartPane = doc.createElement('div');
        daggerheartPane.className = 'daggerheart tab-pane';
        daggerheartPane.style.display = 'none';
        daggerheartPane.innerHTML = `
            <div class="dh-container">
                <div class="dh-title-bar">
                    <h2 id="dh-char-name">PinkDagger</h2>
                    <div class="dh-title-actions">
                        <div class="dh-header-meta">
                            <span>Nível: <strong id="dh-char-nivel">-</strong></span>
                            <span>Proficiência: <strong id="dh-char-prof">-</strong></span>
                        </div>
                        <button type="button" class="dh-title-btn" id="dh-settings-btn" title="Configurações">⚙️</button>
                        <button type="button" class="dh-title-btn" id="dh-dock-btn" title="Fixar ficha no canto da tela">📌</button>
                    </div>
                </div>
                <div id="dh-content-root"></div>
            </div>
        `;
        tabContent.appendChild(daggerheartPane);

        daggerheartPane.querySelector('#dh-settings-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSettingsModal(doc);
        });

        // O dock só funciona para fichas abertas em janela dentro do Roll20 (não em pop-out)
        const dockBtn = daggerheartPane.querySelector('#dh-dock-btn');
        if (getSheetDialog(doc)) {
            dockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDock(doc);
            });
        } else {
            dockBtn.remove();
        }

        const allNavs = navTabs.querySelectorAll('li');
        const allPanes = tabContent.querySelectorAll('.tab-pane');

        daggerheartNavItem.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            allNavs.forEach(nav => nav.classList.remove('active', '"active"'));
            allPanes.forEach(pane => {
                pane.style.display = 'none';
                pane.classList.remove('active');
            });

            daggerheartNavItem.classList.add('active');
            daggerheartPane.style.display = 'block';
            daggerheartPane.classList.add('active');

            populateDaggerheartData(doc);
        });

        allNavs.forEach(nav => {
            if (nav !== daggerheartNavItem) {
                nav.addEventListener('click', function () {
                    daggerheartPane.style.display = 'none';
                    daggerheartNavItem.classList.remove('active');
                });
            }
        });
    }

    setInterval(() => {
        initDaggerheartTab(document);

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                if (iframe.contentDocument) {
                    initDaggerheartTab(iframe.contentDocument);
                }
            } catch (err) {}
        });
    }, 1000);

})();