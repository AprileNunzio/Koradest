const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default {
    render: async (el, params = {}) => {
        try {
            let SUBAPPS = [];
            if (window.electronAPI) {
                SUBAPPS = await window.electronAPI.getSubAppsRegistry('amministratore');
            }
            const renderHome = () => {
                el.innerHTML = `
                    <div class="k-page fade-in-up">
                        <header class="k-page-header">
                            <div class="k-page-heading">
                                <span class="k-page-icon material-symbols-rounded">admin_panel_settings</span>
                                <div>
                                    <h1 class="k-page-title">Amministratore</h1>
                                    <p class="k-page-subtitle">Utenti, ruoli, sicurezza e configurazione del nodo</p>
                                </div>
                            </div>
                            <div class="k-input-group" style="flex: 1 1 100%;">
                                <span class="material-symbols-rounded">search</span>
                                <input type="search" id="subapp-search" class="k-input" placeholder="Cerca modulo..." aria-label="Cerca modulo">
                            </div>
                        </header>
                        <div id="subapps-grid" class="subapps-grid"></div>
                    </div>
                `;
                const grid = el.querySelector('#subapps-grid');
                const searchInput = el.querySelector('#subapp-search');
                const renderSubApps = (filterText = '') => {
                    grid.innerHTML = '';
                    const cerca = filterText.toLowerCase();
                    const filtered = SUBAPPS.filter(app =>
                        app.name.toLowerCase().includes(cerca) ||
                        (app.description && app.description.toLowerCase().includes(cerca))
                    );
                    if (filtered.length === 0) {
                        grid.innerHTML = `
                            <div class="k-empty" style="grid-column: 1 / -1;">
                                <span class="material-symbols-rounded">search_off</span>
                                <div class="k-empty-title">Nessun modulo trovato</div>
                            </div>`;
                        return;
                    }
                    filtered.forEach(app => {
                        const card = document.createElement('div');
                        card.className = 'app-card subapp-card fade-in-up';
                        card.setAttribute('data-id', app.folder);
                        card.title = app.description || app.name;
                        let iconHtml = '';
                        if (app.icon && !app.icon.includes('.')) {
                            iconHtml = `<span class="material-symbols-rounded app-icon" style="color: var(--md-primary);">${esc(app.icon)}</span>`;
                        } else {
                            const iconPath = app.icon ? `koradest-app://amministratore/subapps/${app.folder}/${app.icon}` : '';
                        iconHtml = app.icon && app.icon.includes('.')
                            ? `<img src="${esc(iconPath)}" class="app-icon" alt="" onerror="this.outerHTML='<span class=&quot;material-symbols-rounded app-icon&quot; style=&quot;color: var(--md-primary);&quot;>extension</span>'">`
                            : `<span class="material-symbols-rounded app-icon" style="color: var(--md-primary);">extension</span>`;
                        }
                        card.innerHTML = `
                            ${iconHtml}
                            <div class="app-title">${esc(app.name)}</div>
                            ${app.description ? `<div class="app-desc">${esc(app.description)}</div>` : ''}
                        `;
                        card.addEventListener('click', async () => {
                            try {
                                const { Router } = await import('../../js/utils.js');
                                Router.navigate('app_container', { appId: 'amministratore', subAppId: app.folder });
                            } catch (err) {
                                console.error('[Amministratore] Apertura modulo non riuscita:', err);
                            }
                        });
                        grid.appendChild(card);
                    });
                };
                renderSubApps();
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        renderSubApps(e.target.value);
                    });
                }
            };
            const renderSubApp = async (id) => {
                try {
                    const subAppDef = SUBAPPS.find(s => s.folder === id);
                    el.innerHTML = `
                        <div class="fade-in-up" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                            <div id="subapp-mount-point" style="flex: 1; display: flex; flex-direction: column;">
                                <div class="k-loading" style="height: 100%;">
                                    <div class="k-spinner"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    const mountPoint = el.querySelector('#subapp-mount-point');
                    try {
                        const mainFile = subAppDef && subAppDef.main ? subAppDef.main : 'app.js';
                        const bust = Date.now();
                        const module = await import(`./subapps/${id}/${mainFile}?v=${bust}`);
                        if (module && module.default && typeof module.default.render === 'function') {
                            await module.default.render(mountPoint);
                        } else {
                            throw new Error("Invalid subapp module");
                        }
                    } catch (importErr) {
                        console.error("SubApp Import Error:", importErr);
                        mountPoint.innerHTML = `
                            <div class="k-empty">
                                <span class="material-symbols-rounded" style="color: var(--md-error); background: var(--md-error-container);">error</span>
                                <div class="k-empty-title">Modulo non caricato</div>
                                <p class="k-empty-text">${esc(importErr.message)}</p>
                            </div>`;
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            if (params.subAppId) {
                renderSubApp(params.subAppId);
            } else {
                renderHome();
            }
        } catch (e) {
            console.error(e);
            el.innerHTML = '<p>Errore critico caricamento Amministratore</p>';
        }
    }
};
