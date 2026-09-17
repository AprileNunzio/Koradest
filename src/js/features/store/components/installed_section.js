import { Router } from '../../../utils.js';
import { renderAppIcon } from './app_icon.js';
import { categoriaDi } from '../../../shell/app_categories.js';
import { esc } from '../../../shared/html.js';

function millisecondiDi(val) {
    try {
        if (!val) return null;
        let ts = val;
        if (typeof val === 'string' && /^d+$/.test(val)) ts = Number(val);
        if (typeof ts === 'number') return ts < 10000000000 ? ts * 1000 : ts;
        const parsed = Date.parse(val);
        return isNaN(parsed) ? null : parsed;
    } catch (_) {
        return null;
    }
}

function formatData(val) {
    const ms = millisecondiDi(val);
    if (ms === null) return null;
    return new Date(ms).toLocaleDateString('it-IT');
}

function formatDataOra(val) {
    const ms = millisecondiDi(val);
    if (ms === null) return null;
    return new Date(ms).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function cronologia(app) {
    const installato = formatDataOra(app.installed_at);
    const aggiornato = formatDataOra(app.updated_at);
    const voci = [];
    if (installato) voci.push('Installata il ' + installato);
    if (aggiornato && aggiornato !== installato) voci.push('Aggiornata il ' + aggiornato);
    return voci;
}

export function renderInstalledSection(container, apps, options = {}) {
    try {
        if (!apps || apps.length === 0) {
            container.innerHTML = `
                <div class="store-section-card">
                    <div class="store-empty-notice">
                        <span class="material-symbols-rounded">inventory_2</span>
                        <div>Nessuna applicazione trovata per i criteri di ricerca o filtro selezionati.</div>
                    </div>
                </div>
            `;
            return;
        }

        const section = document.createElement('div');
        section.className = 'store-section-card';
        section.innerHTML = `
            <div class="store-section-header" style="background: transparent; border-bottom: 1px solid var(--md-outline-variant); cursor: default;">
                <div class="store-section-header-left">
                    <span class="material-symbols-rounded store-section-icon">history</span>
                    <div>
                        <div class="store-section-title">${options.title || 'Aggiornamenti recenti e applicazioni'} (${apps.length})</div>
                        <div class="store-section-subtitle">Tutti i moduli e le applicazioni registrate nell'ambiente KORADEST</div>
                    </div>
                </div>
            </div>
            <div class="store-list-table" id="body-installed-list"></div>
        `;

        const body = section.querySelector('#body-installed-list');
        apps.forEach(app => {
            const row = document.createElement('div');
            row.className = 'store-row-item';

            const isInstalled = Boolean(app.installed || app.isInstalled || app.core || app.bundled);

            const typeLabel = categoriaDi(app).etichetta;

            let statusLabel = `v${app.version || '1.0.0'}`;
            const storico = cronologia(app);
            const dataPubblicato = formatData(app.published_at);

            if (app.core || app.bundled) {
                statusLabel += ' · Modulo di Sistema';
            } else if (storico.length > 0) {
                statusLabel += ' · ' + storico[storico.length - 1];
            } else if (dataPubblicato) {
                statusLabel += ` · Pubblicato il ${dataPubblicato}`;
            } else {
                statusLabel += ' · Modulo pronto';
            }

            row.innerHTML = `
                <div class="store-app-icon-wrap">${renderAppIcon(app)}</div>
                <div class="store-app-meta">
                    <div class="store-app-name" title="${esc(app.name || app.id)}">${esc(app.name || app.id)}</div>
                    <div class="store-app-author">${esc(app.author || 'NunzioTech')}</div>
                </div>
                <div class="store-app-type-tag">${typeLabel}</div>
                <div class="store-app-status-text" title="${esc(storico.join(' — '))}">${statusLabel}${storico.length > 1 ? `<span class="store-app-storico">${storico[0]}</span>` : ''}</div>
                <div>
                    ${isInstalled ? `
                    <button class="store-action-btn-primary btn-open-app" data-open-id="${esc(app.id)}">
                        <span class="material-symbols-rounded" style="font-size: 1.1rem;">open_in_new</span> Apri
                    </button>` : `
                    <button class="store-action-btn-primary btn-install-app" data-install-id="${esc(app.id)}">
                        <span class="material-symbols-rounded" style="font-size: 1.1rem;">cloud_download</span> Ottieni
                    </button>`}
                </div>
                <div>
                    <button class="store-more-btn" data-more-id="${esc(app.id)}" title="Dettagli e cronologia date">
                        <span class="material-symbols-rounded">more_horiz</span>
                    </button>
                </div>
            `;

            const btnOpen = row.querySelector('.btn-open-app');
            if (btnOpen) {
                btnOpen.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (app.core || app.bundled) {
                        Router.navigate(app.id);
                    } else {
                        Router.navigate('app_container', { appId: app.id });
                    }
                });
            }

            const btnInstall = row.querySelector('.btn-install-app');
            if (btnInstall) {
                btnInstall.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    btnInstall.disabled = true;
                    btnInstall.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; font-size: 1.1rem;">sync</span> Download...`;
                    if (typeof options.onInstall === 'function') {
                        await options.onInstall(app.id);
                    }
                });
            }

            const btnMore = row.querySelector('.store-more-btn');
            if (btnMore) {
                btnMore.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof options.onDetails === 'function') {
                        options.onDetails(app);
                    }
                });
            }

            body.appendChild(row);
        });

        container.innerHTML = '';
        container.appendChild(section);
    } catch (e) {
        console.error(e);
    }
}
