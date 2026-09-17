import { Router, toast } from '../../utils.js';
import { impostaTitoloPagina } from '../../shell/page_title.js';

const PAGINA = 'app_container';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const statoCentrato = ({ icona, tono = 'primary', titolo, testo, pulsante = null, animato = false }) => `
    <div class="k-page k-page--narrow" style="justify-content: center; min-height: 100%;">
        <div class="k-card k-empty">
            <span class="material-symbols-rounded${animato ? ' spin' : ''}" style="color: var(--md-${tono}); background: var(--md-${tono}-container);">${icona}</span>
            <div class="k-empty-title">${titolo}</div>
            <p class="k-empty-text">${testo}</p>
            ${pulsante ? `<button id="${pulsante.id}" class="k-btn ${pulsante.variante || ''}" style="margin-top: var(--k-space-2);">${pulsante.etichetta}</button>` : ''}
        </div>
    </div>
`;

const tornaAllaHome = () => {
    Router.navigate((window.currentUser || sessionStorage.getItem('currentUserId')) ? 'dashboard' : 'auth_login');
};

async function smontaAppCorrente() {
    document.getElementById('main-content')?.classList.remove('is-app-container');
    const corrente = window.__currentMountedApp;
    window.__currentMountedApp = null;
    if (corrente && typeof corrente.unmount === 'function') {
        try {
            await corrente.unmount();
        } catch (e) {
            console.error('[AppContainer] Chiusura dell\'app precedente non riuscita:', e);
        }
    }
}

function ascoltaCicloDiVita(el, appId, appFolder) {
    const store = window.electronAPI && window.electronAPI.store;
    if (!store) return;
    const riguarda = (data) => data && (data.appId === appId || data.appId === appFolder);
    const rimuoviStile = () => document.querySelector(`link[data-app-css="${appFolder}"]`)?.remove();
    if (typeof store.onAppUpdated === 'function') {
        store.onAppUpdated(async (data) => {
            if (!riguarda(data)) return;
            await smontaAppCorrente();
            rimuoviStile();
            el.innerHTML = '';
            Router.navigate('app_container', { appId });
        });
    }
    if (typeof store.onAppUninstalled === 'function') {
        store.onAppUninstalled(async (data) => {
            if (!riguarda(data)) return;
            await smontaAppCorrente();
            rimuoviStile();
            Router.navigate('dashboard');
        });
    }
}

async function verificaAccesso(el, mountPoint, appId) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return true;
    const userPerms = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
    const hasAccess = userPerms.includes('*') || userPerms.includes(`${appId}:view`) || userPerms.some(p => p.startsWith(`${appId}:`));
    if (hasAccess) return true;
    mountPoint.innerHTML = statoCentrato({
        icona: 'gpp_bad',
        tono: 'error',
        titolo: 'Accesso negato',
        testo: 'Non hai i permessi necessari per questa applicazione. Chiedi l\'accesso all\'amministratore di sistema.',
        pulsante: { id: 'btn-back-auth', etichetta: 'Torna alla Dashboard', variante: 'k-btn--primary' }
    });
    el.querySelector('#btn-back-auth')?.addEventListener('click', tornaAllaHome);
    return false;
}

async function attendiAggiornamenti(el, mountPoint, appId) {
    try {
        window.electronAPI.store.checkUpdates().then(updateRes => {
            try {
                const pendingUpdate = updateRes && updateRes.success && Array.isArray(updateRes.data)
                    ? updateRes.data.find(u => u.appId === appId)
                    : null;
                if (pendingUpdate) {
                    toast(`Aggiornamento disponibile per ${appId}: v${pendingUpdate.availableVersion}`, 'info');
                }
            } catch (_) {}
        }).catch(() => {});
    } catch (_) {}

    try {
        const lockRes = await window.electronAPI.store.isAppLocked(appId);
        if (!lockRes || !lockRes.locked) return true;
        mountPoint.innerHTML = statoCentrato({
            icona: 'system_update',
            titolo: 'Aggiornamento in corso',
            testo: `L'applicazione <strong>${esc(appId)}</strong> è in aggiornamento e sarà disponibile al termine.`,
            pulsante: { id: 'btn-back-updating', etichetta: 'Torna alla Dashboard' },
            animato: true
        });
        mountPoint.querySelector('#btn-back-updating')?.addEventListener('click', () => Router.navigate('dashboard'));
        window.electronAPI.store.onAppUpdated?.(data => {
            if (data && data.appId === appId) {
                el.innerHTML = '';
                Router.navigate('app_container', { appId });
            }
        });
        return false;
    } catch (lockErr) {
        console.warn('[AppContainer] Stato di blocco non disponibile:', lockErr);
        return true;
    }
}

async function montaAppDiSistema(el, mountPoint, appId, appFolder, appManifest, params) {
    const mainFile = (appManifest && appManifest.main) || 'app.js';
    const stampToken = (appManifest?.version ? `${appManifest.version}_${Date.now()}` : `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '_');
    let appModule = null;
    try {
        appModule = await import(`../../../apps/${appFolder}/${mainFile}?v=${stampToken}`);
    } catch (e1) {
        appModule = await import(`../../../apps/${appId}/app.js?v=${stampToken}`);
    }

    const modInstance = appModule?.default || appModule;
    const targetMount = modInstance && typeof modInstance.mount === 'function'
        ? modInstance.mount
        : (modInstance && typeof modInstance.render === 'function' ? modInstance.render : null);

    if (!targetMount) {
        mountPoint.innerHTML = statoCentrato({
            icona: 'error',
            tono: 'error',
            titolo: 'Errore di caricamento',
            testo: `Il modulo <b>${esc(appId)}</b> non espone un punto di montaggio valido.`,
            pulsante: { id: 'btn-back-error', etichetta: 'Torna alla Dashboard' }
        });
        el.querySelector('#btn-back-error')?.addEventListener('click', tornaAllaHome);
        return;
    }
    window.__currentMountedApp = modInstance;
    await targetMount(mountPoint, params);
}

export default {
    render: async (el, params) => {
        try {
            const appId = params?.appId;
            if (!appId) {
                el.innerHTML = statoCentrato({ icona: 'error', tono: 'error', titolo: 'Applicazione non indicata', testo: 'Nessun identificativo applicativo fornito.' });
                return;
            }
            impostaTitoloPagina(PAGINA, appId);
            el.classList.add('is-app-container');
            el.innerHTML = `
                <div id="app-mount-point" style="height: 100%; width: 100%;">
                    <div class="k-loading" style="height: 100%;">
                        <div class="k-spinner" style="--k-spinner-size: 2rem;"></div>
                        <span>Avvio modulo in corso...</span>
                    </div>
                </div>
            `;
            const mountPoint = el.querySelector('#app-mount-point');

            let appManifest = null;
            if (window.electronAPI) {
                if (!(await verificaAccesso(el, mountPoint, appId))) return;
                if (!(await attendiAggiornamenti(el, mountPoint, appId))) return;
                const allApps = await window.electronAPI.getAppsRegistry();
                appManifest = (Array.isArray(allApps) ? allApps : []).find(a => a.folder === appId || a.id === appId) || null;
                if (!appManifest) {
                    mountPoint.innerHTML = statoCentrato({
                        icona: 'extension_off',
                        tono: 'error',
                        titolo: 'Applicazione non disponibile',
                        testo: `<b>${esc(appId)}</b> non è installata oppure il suo manifest non è compatibile con questa versione di KORADEST. Aggiornala dallo App Store.`,
                        pulsante: { id: 'btn-back-error', etichetta: 'Torna alla Dashboard' }
                    });
                    el.querySelector('#btn-back-error')?.addEventListener('click', tornaAllaHome);
                    return;
                }
            }

            const appFolder = appManifest?.folder || appManifest?.id || appId;
            impostaTitoloPagina(PAGINA, appManifest?.name || appId);
            await smontaAppCorrente();

            try {
                if (appManifest && appManifest.manifestVersion === 2) {
                    const { montaAppIsolata } = await import('../../shell/app_bridge.js');
                    const istanza = montaAppIsolata(mountPoint, appManifest, params || {});
                    window.__currentMountedApp = { unmount: istanza.distruggi };
                } else {
                    await montaAppDiSistema(el, mountPoint, appId, appFolder, appManifest, params);
                }
                ascoltaCicloDiVita(el, appId, appFolder);
            } catch (importError) {
                console.error('[AppContainer] Caricamento dell\'app non riuscito: ' + appId, importError);
                mountPoint.innerHTML = statoCentrato({
                    icona: 'broken_image',
                    tono: 'error',
                    titolo: 'Modulo non trovato',
                    testo: `Impossibile caricare il modulo <b>${esc(appId)}</b>: il file principale potrebbe essere assente o danneggiato.`,
                    pulsante: { id: 'btn-back-error', etichetta: 'Torna alla Dashboard' }
                });
                el.querySelector('#btn-back-error')?.addEventListener('click', tornaAllaHome);
            }
        } catch (e) {
            console.error(e);
            el.innerHTML = statoCentrato({ icona: 'error', tono: 'error', titolo: 'Errore critico', testo: 'Il contenitore dell\'applicazione non è riuscito ad avviarsi.' });
        }
    }
};
