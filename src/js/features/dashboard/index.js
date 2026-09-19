import { Router } from '../../utils.js';
import { categoriaDi, raggruppaPerCategoria } from '../../shell/app_categories.js';
import { esc } from '../../shared/html.js';
import { icona3d, icona3dImmagine, applicaRipieghiImmagine } from '../../shared/tinte.js';
import { attributoDiModulo } from '../../shared/moduli.js';

const UPDATE_BADGE = {
    pending:     { cls: 'badge-updating', icon: 'schedule',      text: 'In coda' },
    downloading: { cls: 'badge-updating', icon: 'download',       text: 'Scaricamento...' },
    installing:  { cls: 'badge-updating', icon: 'system_update',  text: 'Installazione...' },
    done:        { cls: 'badge-done',     icon: 'check_circle',   text: 'Aggiornato' },
    error:       { cls: 'badge-error',    icon: 'error',          text: 'Errore' }
};

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;

function buildUserApps(allApps, installedAppsData, userPerms) {
    try {
        const isSuperAdmin = userPerms.includes('*');
        const installedIds = (installedAppsData || []).map(a => a.id || a.app_id || a.folder);
        const now = Date.now();

        const filtered = (allApps || []).filter(app => {
            if (app.is_deleted) return false;
            const targetId = app.id || app.folder;
            if (!app.core && !app.bundled && !installedIds.includes(targetId)) return false;
            if (isSuperAdmin) return true;
            return userPerms.includes(`${targetId}:view`) || userPerms.some(p => p.startsWith(`${targetId}:`));
        });

        for (const app of filtered) {
            const targetId = app.id || app.folder;
            const matchInstalled = (installedAppsData || []).find(i => (i.id || i.app_id || i.folder) === targetId);
            const rawInst = matchInstalled && (matchInstalled.installed_at || matchInstalled.installedAt);
            const rawUpd = matchInstalled && (matchInstalled.updated_at || matchInstalled.updatedAt);
            const installedTime = rawInst ? new Date(rawInst).getTime() : NaN;
            const updatedTime = rawUpd ? new Date(rawUpd).getTime() : NaN;

            const isUpdatedRecent = !isNaN(updatedTime) && (now - updatedTime) < SETTE_GIORNI_MS && (!isNaN(installedTime) ? (updatedTime - installedTime > 60000) : true);
            const isNewRecent = !isUpdatedRecent && !isNaN(installedTime) && (now - installedTime) < SETTE_GIORNI_MS;

            app.__isUpdated = isUpdatedRecent;
            app.__isNew = isNewRecent;
            app.__version = app.version || (matchInstalled && matchInstalled.version) || '';
            app.__categoria = categoriaDi(app);
        }

        const sistema = categoriaDi({ category: 'sistema' });
        if (isSuperAdmin || userPerms.includes('store:view') || userPerms.some(p => p.startsWith('store:'))) {
            filtered.push({
                id: '__store__', name: 'App Store', author: 'KORADEST', __categoria: sistema, __destinazione: 'store', __ordine: 0,
                description: 'Installa le applicazioni con le loro dipendenze e gestisci quelle presenti sul nodo',
                icon: 'icone/store.png'
            });
        }

        filtered.push({
            id: '__info__', name: 'Info', author: 'KORADEST', __categoria: sistema, __destinazione: 'info', __ordine: 99,
            description: 'Chi sviluppa KORADEST, dove restano i tuoi dati e come sostenere il progetto',
            icon: 'icone/info.png'
        });

        return filtered;
    } catch (e) {
        return [];
    }
}

function ordinaNellaCorsia(a, b) {
    const ordineA = a.__ordine ?? (a.core ? 10 : 50);
    const ordineB = b.__ordine ?? (b.core ? 10 : 50);
    if (ordineA !== ordineB) return ordineA - ordineB;
    return (a.name || '').localeCompare(b.name || '', 'it');
}

const RIPIEGO_ICONA = 'icone/applicazione_generica.png';

function iconaDi(app) {
    const folderName = app.folder || app.id;
    const isImage = app.icon && (app.icon.includes('/') || app.icon.includes('.'));
    if (!isImage) {
        return icona3d(app.icon || 'apps', { dimensione: 'xl', varianti: ['reattiva'] });
    }
    let src = app.icon;
    if (!app.__destinazione && !app.icon.includes('//')) {
        src = app.core || app.bundled
            ? `apps/${encodeURIComponent(folderName)}/${encodeURIComponent(app.icon)}`
            : `koradest-app://${encodeURIComponent(folderName)}/${encodeURIComponent(app.icon)}`;
    }
    return icona3dImmagine(src, { dimensione: 'xl', varianti: ['vetro', 'reattiva'], ripiego: RIPIEGO_ICONA });
}

function creaCard(app) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'app-card fade-in-up';
    card.dataset.appId = app.folder || app.id;
    card.title = app.description || app.name || '';
    const attributo = attributoDiModulo(app.folder || app.id);
    const tinta = attributo.match(/data-(tinta|zona)="([a-z]+)"/);
    if (tinta) card.setAttribute(`data-${tinta[1]}`, tinta[2]);
    const badgeStato = app.__isUpdated
        ? '<span class="badge-updated">AGGIORNATA</span>'
        : (app.__isNew ? '<span class="badge-new">NUOVA</span>' : '');
    const badgeVersione = app.__version
        ? `<span class="badge-version">${esc(app.__version.startsWith('v') ? app.__version : 'v' + app.__version)}</span>`
        : '';

    card.innerHTML = `
        ${badgeVersione}
        ${badgeStato}
        ${iconaDi(app)}
        <div class="app-title">${esc(app.name)}</div>
        ${app.description ? `<div class="app-desc">${esc(app.description)}</div>` : ''}
        ${app.author ? `<div class="app-author">${esc(app.author)}</div>` : ''}
    `;
    applicaRipieghiImmagine(card);
    card.addEventListener('click', () => {
        try {
            if (app.__destinazione) Router.navigate(app.__destinazione);
            else Router.navigate('app_container', { appId: app.folder || app.id });
        } catch (e) {
            console.error(e);
        }
    });
    return card;
}

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-page">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            ${icona3d('space_dashboard', { dimensione: 'lg', varianti: ['reattiva'] })}
                            <div>
                                <h1 class="k-page-title">Dashboard</h1>
                                <p class="k-page-subtitle">Seleziona un'applicazione per iniziare a lavorare</p>
                            </div>
                        </div>
                        <label class="k-cerca" style="flex: 1 1 16rem; max-inline-size: 24rem;">
                            <span class="material-symbols-rounded">search</span>
                            <input type="search" id="app-search" placeholder="Cerca applicazione, autore o categoria…" aria-label="Cerca applicazione">
                        </label>
                    </header>
                    <div id="apps-lanes" class="app-lanes">
                        <div class="k-loading">
                            <div class="k-spinner" style="--k-spinner-size: 2rem;"></div>
                            <span>Caricamento applicazioni...</span>
                        </div>
                    </div>
                </div>
            `;

            const contenitore = el.querySelector('#apps-lanes');
            const searchInput = el.querySelector('#app-search');
            let apps = [];

            const caricaApps = async () => {
                if (!window.electronAPI) return [];
                const allApps = await window.electronAPI.getAppsRegistry();
                const userId = sessionStorage.getItem('currentUserId');
                const userPerms = userId && window.electronAPI.rbac
                    ? await window.electronAPI.rbac.getEffectiveUserPermissions(userId)
                    : [];
                let installedAppsData = [];
                try {
                    const storeRes = await window.electronAPI.store.getInstalled();
                    if (storeRes && storeRes.success && Array.isArray(storeRes.data)) installedAppsData = storeRes.data;
                } catch (e) {
                    console.warn('[Dashboard] Elenco app installate non disponibile:', e);
                }
                return buildUserApps(allApps, installedAppsData, Array.isArray(userPerms) ? userPerms : []);
            };

            const renderApps = (filterText = '') => {
                const cerca = filterText.toLowerCase().trim();
                const visibili = apps.filter(a => !cerca
                    || (a.name && a.name.toLowerCase().includes(cerca))
                    || (a.description && a.description.toLowerCase().includes(cerca))
                    || (a.author && a.author.toLowerCase().includes(cerca))
                    || a.__categoria.etichetta.toLowerCase().includes(cerca));

                contenitore.innerHTML = '';
                if (visibili.length === 0) {
                    contenitore.innerHTML = `
                        <div class="k-empty" style="flex: 1 1 100%;">
                            ${icona3d('search_off', { dimensione: 'lg', varianti: ['tenue'] })}
                            <div class="k-empty-title">Nessun applicativo trovato</div>
                            <p class="k-empty-text">Prova con un altro termine di ricerca.</p>
                        </div>`;
                    return;
                }

                for (const { categoria, apps: nellaCorsia } of raggruppaPerCategoria(visibili)) {
                    const corsia = document.createElement('section');
                    corsia.className = 'app-lane';
                    corsia.dataset.categoria = categoria.id;
                    corsia.style.setProperty('--k-corsia-app', String(Math.min(nellaCorsia.length, 12)));
                    corsia.innerHTML = `
                        <header class="app-lane-header">
                            ${icona3d(categoria.icona, { dimensione: 'xs', varianti: ['tenue'] })}
                            <h2 class="app-lane-title">${esc(categoria.etichetta)}</h2>
                            <span class="app-lane-count">${nellaCorsia.length}</span>
                        </header>
                        <div class="apps-grid"></div>
                    `;
                    const griglia = corsia.querySelector('.apps-grid');
                    nellaCorsia.sort(ordinaNellaCorsia).forEach(app => griglia.appendChild(creaCard(app)));
                    contenitore.appendChild(corsia);
                }
            };

            const applyUpdateBadge = (appId, state) => {
                const card = contenitore.querySelector(`[data-app-id="${CSS.escape(appId)}"]`);
                if (!card) return;
                let badge = card.querySelector('.update-badge');
                if (state === 'idle' || !UPDATE_BADGE[state]) {
                    if (badge) badge.remove();
                    card.classList.remove('locked');
                    return;
                }
                const { cls, icon, text } = UPDATE_BADGE[state];
                if (!badge) {
                    badge = document.createElement('span');
                    card.appendChild(badge);
                }
                badge.className = `update-badge ${cls}`;
                badge.innerHTML = `<span class="material-symbols-rounded" style="font-size:0.9rem;vertical-align:middle;">${icon}</span> ${text}`;
                card.classList.toggle('locked', state === 'downloading' || state === 'installing');
            };

            apps = await caricaApps();
            renderApps();
            searchInput?.addEventListener('input', (e) => renderApps(e.target.value));

            const store = window.electronAPI && window.electronAPI.store;
            if (store) {
                store.getUpdateQueue()
                    .then(res => {
                        if (res && res.success && res.data && Array.isArray(res.data.queue)) {
                            res.data.queue.forEach(item => applyUpdateBadge(item.appId, item.state));
                        }
                    })
                    .catch(e => console.warn('[Dashboard] Coda aggiornamenti non disponibile:', e));

                store.onAppUpdateEvent(data => {
                    if (data && data.appId) applyUpdateBadge(data.appId, data.state);
                });

                store.onAppUpdated(async data => {
                    try {
                        if (data && data.appId) setTimeout(() => applyUpdateBadge(data.appId, 'idle'), 5000);
                        apps = await caricaApps();
                        renderApps(searchInput ? searchInput.value : '');
                    } catch (e) {
                        console.error('[Dashboard] Aggiornamento elenco non riuscito:', e);
                    }
                });
            }
        } catch (e) {
            console.error('Dashboard render error:', e);
            el.innerHTML = '<p>Errore durante il caricamento della Dashboard.</p>';
        }
    }
};
