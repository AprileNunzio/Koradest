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
                SUBAPPS = await window.electronAPI.getSubAppsRegistry('anagrafica');
            }
            const renderHome = () => {
                el.innerHTML = `
                    <div class="k-page fade-in-up anagrafica-home">
                        <header class="k-page-header anagrafica-home-header">
                            <div class="k-page-heading">
                                <span class="k-page-icon material-symbols-rounded">badge</span>
                                <div>
                                    <h1 class="k-page-title">Profilo Personale</h1>
                                    <p class="k-page-subtitle">Documenti, contatti, residenza e dati del tuo profilo</p>
                                </div>
                            </div>
                            <div class="k-input-group anagrafica-home-search" style="flex: 1 1 16rem; max-width: 22rem;">
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
                            const iconPath = app.icon ? `apps/anagrafica/subapps/${app.folder}/${app.icon}` : `icone/applicazione_generica.png`;
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
                                Router.navigate('app_container', { appId: 'anagrafica', subAppId: app.folder });
                            } catch (err) {
                                console.error('[Profilo] Apertura modulo non riuscita:', err);
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
            el.innerHTML = '<p>Errore critico caricamento Profilo Personale</p>';
        }
    }
};
