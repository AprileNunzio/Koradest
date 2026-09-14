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
                SUBAPPS = await window.electronAPI.getSubAppsRegistry('impostazioni');
            }
            const renderHome = () => {
                el.innerHTML = `
                    <div class="k-page fade-in-up">
                        <header class="k-page-header">
                            <div class="k-page-heading">
                                <span class="k-page-icon material-symbols-rounded">settings</span>
                                <div>
                                    <h1 class="k-page-title">Impostazioni</h1>
                                    <p class="k-page-subtitle">Configurazione del nodo locale, notifiche e credenziali</p>
                                </div>
                            </div>
                            <div class="k-input-group" style="flex: 1 1 16rem; max-width: 22rem;">
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
                            iconHtml = `<span class="material-symbols-rounded app-icon">${esc(app.icon)}</span>`;
                        } else {
                            const iconPath = app.icon ? `apps/impostazioni/subapps/${app.folder}/${app.icon}` : `icone/applicazione_generica.png`;
                            iconHtml = `<img src="${esc(iconPath)}" class="app-icon" alt="" onerror="this.src='icone/applicazione_generica.png'">`;
                        }
                        card.innerHTML = `
                            ${iconHtml}
                            <div class="app-title">${esc(app.name)}</div>
                            ${app.description ? `<div class="app-desc">${esc(app.description)}</div>` : ''}
                        `;
                        card.addEventListener('click', async () => {
                            try {
                                const { Router } = await import('../../js/utils.js');
                                Router.navigate('app_container', { appId: 'impostazioni', subAppId: app.folder });
                            } catch (err) {
                                console.error('[Impostazioni] Apertura modulo non riuscita:', err);
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
                        <div class="k-page fade-in-up" style="height: 100%;">
                            <header class="k-page-header">
                                <div class="k-page-heading">
                                    <span class="k-page-icon material-symbols-rounded">${esc(subAppDef && subAppDef.icon && !subAppDef.icon.includes('.') ? subAppDef.icon : 'settings')}</span>
                                    <div>
                                        <h1 class="k-page-title">${esc(subAppDef ? subAppDef.name : 'Modulo')}</h1>
                                        <p class="k-page-subtitle">Impostazioni di sistema</p>
                                    </div>
                                </div>
                            </header>
                            <div id="subapp-mount-point" class="k-card" style="flex: 1; min-height: 0; overflow-y: auto;">
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
                        console.error("Subapp Load Error:", importErr);
                        mountPoint.innerHTML = `
                            <div class="k-empty">
                                <span class="material-symbols-rounded" style="color: var(--md-error); background: var(--md-error-container);">error</span>
                                <div class="k-empty-title">Modulo non caricato</div>
                                <pre class="k-mono" style="max-width: 100%; overflow: auto; text-align: left; font-size: var(--k-font-xs); background: var(--md-surface-variant); padding: var(--k-space-3); border-radius: var(--shape-sm);">${esc(importErr && importErr.stack ? importErr.stack : importErr)}</pre>
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
            el.innerHTML = '<p>Errore critico caricamento Impostazioni</p>';
        }
    }
};
