import { Router } from '../utils.js';

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

export default {
    render: async (el, params) => {
        try {
            const appId = params?.appId;
            if (!appId) {
                el.innerHTML = statoCentrato({ icona: 'error', tono: 'error', titolo: 'Applicazione non indicata', testo: 'Nessun identificativo applicativo fornito.' });
                return;
            }
            el.innerHTML = `
                <div id="app-mount-point" style="height: 100%; width: 100%;">
                    <div class="k-loading" style="height: 100%;">
                        <div class="k-spinner" style="--k-spinner-size: 2rem;"></div>
                        <span>Avvio modulo in corso...</span>
                    </div>
                </div>
            `;
            const mountPoint = el.querySelector('#app-mount-point');
            if (window.electronAPI) {
                const userId = sessionStorage.getItem('currentUserId');
                if (userId) {
                    const userPerms = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
                    const viewPermId = `${appId}:view`;
                    const hasAccess = userPerms.includes('*') || userPerms.includes(viewPermId) || userPerms.some(p => p.startsWith(`${appId}:`));
                    if (!hasAccess) {
                        mountPoint.innerHTML = statoCentrato({
                            icona: 'gpp_bad',
                            tono: 'error',
                            titolo: 'Accesso negato',
                            testo: 'Non hai i permessi necessari per questa applicazione. Chiedi l\'accesso all\'amministratore di sistema.',
                            pulsante: { id: 'btn-back-auth', etichetta: 'Torna alla Dashboard', variante: 'k-btn--primary' }
                        });
                        el.querySelector('#btn-back-auth')?.addEventListener('click', tornaAllaHome);
                        return;
                    }
                }

                try {
                    const updateRes = await window.electronAPI.store.checkUpdates();
                    if (updateRes && updateRes.success && Array.isArray(updateRes.data)) {
                        const pendingUpdate = updateRes.data.find(u => u.appId === appId);
                        if (pendingUpdate) {
                            mountPoint.innerHTML = statoCentrato({
                                icona: 'system_update',
                                titolo: 'Aggiornamento in corso',
                                testo: `Installazione automatica della versione <strong>v${esc(pendingUpdate.availableVersion)}</strong> per ${esc(appId)}...`,
                                animato: true
                            });
                            await window.electronAPI.store.install(pendingUpdate.appId);
                        }
                    }
                } catch (checkErr) {}

                try {
                    const lockRes = await window.electronAPI.store.isAppLocked(appId);
                    if (lockRes && lockRes.locked) {
                        mountPoint.innerHTML = statoCentrato({
                            icona: 'system_update',
                            titolo: 'Aggiornamento in corso',
                            testo: `L'applicazione <strong>${esc(appId)}</strong> è in aggiornamento e sarà disponibile al termine.`,
                            pulsante: { id: 'btn-back-updating', etichetta: 'Torna alla Dashboard' },
                            animato: true
                        });
                        mountPoint.querySelector('#btn-back-updating')?.addEventListener('click', () => {
                            Router.navigate('dashboard');
                        });
                        if (window.electronAPI.store.onAppUpdated) {
                            window.electronAPI.store.onAppUpdated(data => {
                                try {
                                    if (data && data.appId === appId) {
                                        el.innerHTML = '';
                                        Router.navigate('app_container', { appId });
                                    }
                                } catch (e) {}
                            });
                        }
                        return;
                    }
                } catch (lockErr) {}
            }

            try {
                let appModule = null;
                let appFolder = appId;
                let mainFile = 'app.js';
                let isMarketplace = false;
                let appManifest = null;

                if (window.electronAPI) {
                    const allApps = await window.electronAPI.getAppsRegistry();
                    appManifest = allApps.find(a => a.folder === appId || a.id === appId);
                    if (appManifest) {
                        appFolder = appManifest.folder || appManifest.id || appId;
                        mainFile = appManifest.main || 'app.js';
                        if (!appManifest.core && !appManifest.bundled) {
                            isMarketplace = true;
                        }
                    }
                }

                const stampToken = (appManifest?.version ? `${appManifest.version}_${Date.now()}` : `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '_');

                if (isMarketplace) {
                    const hostToken = `${appFolder}--v${stampToken}`;
                    const cssPath = `koradest-app://${hostToken}/css/style.css`;
                    const existingLink = document.querySelector(`link[data-app-css="${appFolder}"]`);
                    if (existingLink) {
                        existingLink.href = cssPath;
                    } else {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = cssPath;
                        link.setAttribute('data-app-css', appFolder);
                        document.head.appendChild(link);
                    }
                    try {
                        appModule = await import(`koradest-app://${hostToken}/${mainFile}`);
                    } catch (impErr) {
                        try {
                            appModule = await import(`koradest-app://${appFolder}/${mainFile}?v=${stampToken}`);
                        } catch (eFallback) {
                            appModule = await import(`koradest-app://${appFolder}/${mainFile}`);
                        }
                    }
                } else {
                    try {
                        appModule = await import(`../../apps/${appFolder}/${mainFile}?v=${stampToken}`);
                    } catch (e1) {
                        try {
                            appModule = await import(`../../apps/${appId}/app.js?v=${stampToken}`);
                        } catch (e2) {
                            appModule = await import(`../apps/${appFolder}/${mainFile}?v=${stampToken}`);
                        }
                    }
                }

                const modInstance = appModule?.default || appModule;
                const targetMount = (modInstance && typeof modInstance.mount === 'function')
                    ? modInstance.mount
                    : ((modInstance && typeof modInstance.render === 'function') ? modInstance.render : null);

                if (targetMount) {
                    if (window.__currentMountedApp && typeof window.__currentMountedApp.unmount === 'function') {
                        try {
                            await window.__currentMountedApp.unmount();
                        } catch (_) {}
                    }
                    window.__currentMountedApp = modInstance;
                    await targetMount(mountPoint, params);

                    if (window.electronAPI?.store?.onAppUpdated) {
                        window.electronAPI.store.onAppUpdated(async data => {
                            try {
                                if (data && (data.appId === appId || data.appId === appFolder)) {
                                    if (window.__currentMountedApp && typeof window.__currentMountedApp.unmount === 'function') {
                                        try { await window.__currentMountedApp.unmount(); } catch (_) {}
                                    }
                                    window.__currentMountedApp = null;
                                    const oldCss = document.querySelector(`link[data-app-css="${appFolder}"]`);
                                    if (oldCss) oldCss.remove();
                                    el.innerHTML = '';
                                    Router.navigate('app_container', { appId });
                                }
                            } catch (_) {}
                        });
                    }

                    if (window.electronAPI?.store?.onAppUninstalled) {
                        window.electronAPI.store.onAppUninstalled(async data => {
                            try {
                                if (data && (data.appId === appId || data.appId === appFolder)) {
                                    if (window.__currentMountedApp && typeof window.__currentMountedApp.unmount === 'function') {
                                        try { await window.__currentMountedApp.unmount(); } catch (_) {}
                                    }
                                    window.__currentMountedApp = null;
                                    const oldCss = document.querySelector(`link[data-app-css="${appFolder}"]`);
                                    if (oldCss) oldCss.remove();
                                    Router.navigate('dashboard');
                                }
                            } catch (_) {}
                        });
                    }
                } else {
                    mountPoint.innerHTML = statoCentrato({
                        icona: 'error',
                        tono: 'error',
                        titolo: 'Errore di caricamento',
                        testo: `Il modulo <b>${esc(appId)}</b> non espone un punto di montaggio valido.`,
                        pulsante: { id: 'btn-back-error', etichetta: 'Torna alla Dashboard' }
                    });
                    el.querySelector('#btn-back-error')?.addEventListener('click', tornaAllaHome);
                }
            } catch (importError) {
                console.error("Dynamic import failed for app: " + appId, importError);
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
