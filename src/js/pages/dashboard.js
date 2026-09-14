import { Router } from '../utils.js';
import { categoriaDi, raggruppaPerCategoria } from '../shell/app_categories.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const UPDATE_BADGE = {
    pending:     { cls: 'badge-updating', icon: 'schedule',      text: 'In coda' },
    downloading: { cls: 'badge-updating', icon: 'download',       text: 'Scaricamento...' },
    installing:  { cls: 'badge-updating', icon: 'system_update',  text: 'Installazione...' },
    done:        { cls: 'badge-done',     icon: 'check_circle',   text: 'Aggiornato' },
    error:       { cls: 'badge-error',    icon: 'error',          text: 'Errore' }
};

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;

function buildUserApps(allApps, installedAppsData, userPerms) {
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
        const installedTime = matchInstalled && matchInstalled.installedAt ? new Date(matchInstalled.installedAt).getTime() : NaN;
        app.__isNew = !isNaN(installedTime) && (now - installedTime) < SETTE_GIORNI_MS;
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
    if (isSuperAdmin) {
        filtered.push({
            id: '__nodi__', name: 'Nodi e Rete', author: 'KORADEST', __categoria: sistema, __destinazione: 'nodes_manager', __ordine: 1,
            description: 'Stato dei nodi collegati, sincronizzazione del registro e salute della rete',
            icon: 'hub', color: 'var(--md-primary)'
        });
    }
    filtered.push({
        id: '__info__', name: 'Info', author: 'KORADEST', __categoria: sistema, __destinazione: 'info', __ordine: 99,
        description: 'Chi sviluppa KORADEST, dove restano i tuoi dati e come sostenere il progetto',
        icon: 'icone/info.png'
    });

    return filtered;
}

function ordinaNellaCorsia(a, b) {
    const ordineA = a.__ordine ?? (a.core ? 10 : 50);
    const ordineB = b.__ordine ?? (b.core ? 10 : 50);
    if (ordineA !== ordineB) return ordineA - ordineB;
    return (a.name || '').localeCompare(b.name || '', 'it');
}

function iconaDi(app) {
    const folderName = app.folder || app.id;
    const isImage = app.icon && (app.icon.includes('/') || app.icon.includes('.'));
    if (!isImage) {
        return `<span class="material-symbols-rounded app-icon" style="color: ${esc(app.color || 'var(--md-primary)')};">${esc(app.icon || 'apps')}</span>`;
    }
    let src = app.icon;
    if (!app.__destinazione && !app.icon.includes('//')) {
        src = app.core || app.bundled ? `apps/${folderName}/${app.icon}` : `koradest-app://${folderName}/${app.icon}`;
    }
    return `<img src="${esc(src)}" class="app-icon" alt="" onerror="this.src='icone/applicazione_generica.png'">`;
}

function creaCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card fade-in-up';
    card.dataset.appId = app.folder || app.id;
    card.title = app.description || app.name || '';
    card.innerHTML = `
        ${app.__isNew ? '<span class="badge-new">NUOVA</span>' : ''}
        ${iconaDi(app)}
        <div class="app-title">${esc(app.name)}</div>
        ${app.description ? `<div class="app-desc">${esc(app.description)}</div>` : ''}
        ${app.author ? `<div class="app-author">${esc(app.author)}</div>` : ''}
    `;
    card.addEventListener('click', () => {
        if (app.__destinazione) Router.navigate(app.__destinazione);
        else Router.navigate('app_container', { appId: app.folder || app.id });
    });
    return card;
}

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="page-container">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h1 class="text-title" style="margin-bottom: 0.2rem; font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em;">Dashboard Principale</h1>
                            <p class="text-body" style="color: var(--md-on-surface-variant); font-size: 0.95rem;">Seleziona un'applicazione per iniziare a lavorare</p>
                        </div>
                        <div class="search-box" style="position: relative; width: 280px;">
                            <span class="material-symbols-rounded" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--md-on-surface-variant); pointer-events: none;">search</span>
                            <input type="text" id="app-search" class="input" placeholder="Cerca applicativo..." style="padding-left: 2.8rem; width: 100%; border-radius: 20px; border: 1px solid var(--md-outline-variant); background: rgba(255, 255, 255, 0.7); color: var(--md-on-surface); height: 44px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <div id="apps-lanes">
                        <div style="text-align: center; padding: 3rem;">
                            <span class="material-symbols-rounded spin" style="font-size: 3rem; color: var(--md-primary);">sync</span>
                            <p style="margin-top: 1rem; color: var(--md-on-surface-variant);">Caricamento applicativi in corso...</p>
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
                    contenitore.innerHTML = '<p style="color: var(--md-on-surface-variant); text-align: center; padding: 2rem;">Nessun applicativo trovato.</p>';
                    return;
                }

                for (const { categoria, apps: nellaCorsia } of raggruppaPerCategoria(visibili)) {
                    const corsia = document.createElement('section');
                    corsia.className = 'app-lane';
                    corsia.dataset.categoria = categoria.id;
                    corsia.innerHTML = `
                        <header class="app-lane-header">
                            <span class="material-symbols-rounded app-lane-icon">${esc(categoria.icona)}</span>
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
