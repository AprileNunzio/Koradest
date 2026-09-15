import { toast } from '../../../../js/utils.js';
import { esc, interruttore, creaNuovoGruppoDialog, gestisciMembriGruppoDialog, apriIspettorePermessiDialog } from './rbac_dialogs.js';

const registraErrore = (e) => {
    console.error('[RBAC]', e);
    if (window.electronAPI && window.electronAPI.logError) window.electronAPI.logError(e.stack || e.message);
};

function iconaApp(app, stile = 'width: 2.5rem; height: 2.5rem;') {
    if (app.icon && app.icon.includes('.')) {
        const percorso = app.icon.includes('//')
            ? app.icon
            : (app.core || app.bundled ? `apps/${app.folder}/${app.icon}` : `koradest-app://${app.folder}/${app.icon}`);
        return `<img src="${esc(percorso)}" alt="" style="${stile} object-fit: contain;" onerror="this.src='icone/applicazione_generica.png'">`;
    }
    return `<span class="material-symbols-rounded" style="font-size: 2rem; color: var(--md-primary);">${esc(app.icon || 'apps')}</span>`;
}

export default {
    render: async (el) => {
        try {
            await window.electronAPI.rbac.syncPermissionsFromManifests();
        } catch (e) {
            registraErrore(e);
        }

        el.innerHTML = `
            <div class="k-page fade-in-up" style="min-height: 100%;">
                <header class="k-page-header">
                    <div class="k-page-heading">
                        <span class="k-page-icon material-symbols-rounded">admin_panel_settings</span>
                        <div>
                            <h1 class="k-page-title">Ruoli e permessi</h1>
                            <p class="k-page-subtitle">Assegna a gruppi e utenti i permessi di ogni applicazione.</p>
                        </div>
                    </div>
                    <div class="k-page-actions">
                        <button id="btn-inspect-permissions" class="k-btn">
                            <span class="material-symbols-rounded">find_in_page</span>Ispettore permessi
                        </button>
                    </div>
                </header>

                <div class="k-split" style="flex: 1; align-items: stretch;">
                    <aside class="k-card k-card--flush" style="display: flex; flex-direction: column; min-height: 24rem;">
                        <div class="k-card-header">
                            <h2 class="k-card-title">Assegnatari</h2>
                            <button id="btn-add-group" class="k-btn k-btn--tonal k-btn--sm">
                                <span class="material-symbols-rounded">group_add</span>Gruppo
                            </button>
                        </div>
                        <div style="padding: var(--k-space-3) var(--k-space-4); border-bottom: 1px solid var(--md-outline);">
                            <div class="k-input-group">
                                <span class="material-symbols-rounded">search</span>
                                <input type="search" id="rbac-search-input" class="k-input k-input--sm" placeholder="Cerca gruppo o utente..." aria-label="Cerca gruppo o utente">
                            </div>
                        </div>
                        <nav id="rbac-sidebar-content" class="k-list" style="flex: 1; overflow-y: auto; padding: var(--k-space-2);">
                            <div class="k-loading"><div class="k-spinner"></div></div>
                        </nav>
                    </aside>

                    <section id="rbac-main-content" class="k-card" style="min-height: 24rem; overflow-y: auto;">
                        <div class="k-empty" style="height: 100%;">
                            <span class="material-symbols-rounded">admin_panel_settings</span>
                            <div class="k-empty-title">Seleziona un gruppo o un utente</div>
                            <p class="k-empty-text">Scegli un assegnatario a sinistra per gestirne i permessi.</p>
                        </div>
                    </section>
                </div>
            </div>
        `;

        const sidebar = el.querySelector('#rbac-sidebar-content');
        const main = el.querySelector('#rbac-main-content');
        let appsCache = [];
        const subAppsCache = {};
        let allUsersCache = [];
        let currentGroupUsers = [];
        let currentTarget = null;

        const caricamento = () => '<div class="k-loading"><div class="k-spinner"></div></div>';

        const elementoSidebar = (tipo, voce, icona, nome) => `
            <button type="button" class="k-list-item" data-type="${tipo}" data-id="${esc(voce.id)}" data-name="${esc(nome)}" data-superadmin="${voce.is_superadmin ? 1 : 0}">
                <span class="material-symbols-rounded">${icona}</span>
                <span class="k-truncate" style="flex: 1;">${esc(nome)}</span>
                ${voce.is_superadmin ? '<span class="k-badge k-badge--warning">Super admin</span>' : ''}
            </button>`;

        const loadData = async () => {
            try {
                const [groups, users, apps] = await Promise.all([
                    window.electronAPI.rbac.getAllGroups(),
                    window.electronAPI.rbac.getAllUsers(),
                    window.electronAPI.getAppsRegistry()
                ]);
                appsCache = Array.isArray(apps) ? apps : [];
                for (const app of appsCache) {
                    const subapps = await window.electronAPI.getSubAppsRegistry(app.id);
                    subAppsCache[app.id] = Array.isArray(subapps) ? subapps : [];
                }
                allUsersCache = Array.isArray(users) ? users : [];
                const gruppi = Array.isArray(groups) ? groups : [];
                sidebar.innerHTML = `
                    <div class="k-stat-label" data-intestazione style="padding: var(--k-space-2) var(--k-space-3) var(--k-space-1);">Gruppi</div>
                    ${gruppi.map(g => elementoSidebar('group', g, 'group', g.name)).join('') || '<p class="k-hint" style="padding: 0 var(--k-space-3);">Nessun gruppo.</p>'}
                    <div class="k-stat-label" data-intestazione style="padding: var(--k-space-4) var(--k-space-3) var(--k-space-1);">Utenti</div>
                    ${allUsersCache.map(u => elementoSidebar('user', u, 'person', u.username)).join('') || '<p class="k-hint" style="padding: 0 var(--k-space-3);">Nessun utente.</p>'}
                `;
            } catch (e) {
                registraErrore(e);
                sidebar.innerHTML = `<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>${esc(e.message)}</div></div>`;
            }
        };

        const renderAppsGrid = async () => {
            if (!currentTarget) return;
            let membri = '';
            if (currentTarget.type === 'group') {
                try {
                    const utenti = await window.electronAPI.rbac.getGroupUsers(currentTarget.id);
                    currentGroupUsers = Array.isArray(utenti) ? utenti : [];
                    const nomi = allUsersCache.filter(u => currentGroupUsers.includes(u.id)).map(u => u.username).join(', ');
                    membri = `
                        <div class="k-card k-card--muted k-row k-row--between" style="padding: var(--k-space-3) var(--k-space-4);">
                            <div style="min-width: 0;">
                                <div style="font-weight: 600;">Membri del gruppo (${currentGroupUsers.length})</div>
                                <div class="k-hint k-truncate">${esc(nomi || 'Nessun membro assegnato')}</div>
                            </div>
                            <button class="k-btn k-btn--sm" data-azione="membri">
                                <span class="material-symbols-rounded">manage_accounts</span>Gestisci membri
                            </button>
                        </div>`;
                } catch (e) {
                    registraErrore(e);
                    membri = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Membri del gruppo non disponibili.</div></div>';
                }
            }
            main.innerHTML = `
                <div class="k-stack">
                    <div class="k-card-header" style="margin: 0;">
                        <h2 class="k-card-title">
                            <span class="material-symbols-rounded">${currentTarget.type === 'group' ? 'group' : 'person'}</span>
                            Permessi di ${esc(currentTarget.name)}
                        </h2>
                    </div>
                    ${membri}
                    <div class="k-grid k-grid--sm">
                        ${appsCache.map(app => `
                            <button type="button" class="k-card k-card--interactive k-stack" data-app="${esc(app.id)}" style="--k-gap: var(--k-space-2); align-items: center; text-align: center; padding: var(--k-space-4); font: inherit; color: inherit;">
                                ${iconaApp(app)}
                                <span style="font-weight: 600; font-size: var(--k-font-md);">${esc(app.name)}</span>
                            </button>`).join('')}
                    </div>
                </div>`;
        };

        const rigaPermesso = (permId, etichetta, attivo, disabilitato) => `
            <div class="k-row k-row--between" style="padding: var(--k-space-3) var(--k-space-4); border-bottom: 1px solid var(--md-outline);">
                <span style="font-size: var(--k-font-md);">${esc(etichetta)}</span>
                ${interruttore(`data-perm="${esc(permId)}" ${attivo ? 'checked' : ''} ${disabilitato ? 'disabled' : ''}`, etichetta)}
            </div>`;

        const openAppPermissions = async (appId) => {
            if (!currentTarget) return;
            const app = appsCache.find(a => a.id === appId);
            if (!app) return;
            main.innerHTML = caricamento();
            try {
                const targetPerms = currentTarget.type === 'group'
                    ? await window.electronAPI.rbac.getGroupPermissions(currentTarget.id)
                    : await window.electronAPI.rbac.getUserPermissions(currentTarget.id);
                const concessi = Array.isArray(targetPerms) ? targetPerms : [];
                const subapps = subAppsCache[appId] || [];
                const tutti = [];
                (app.rbacPermissions || []).forEach(p => tutti.push(`${app.id}:${p.id}`));
                subapps.forEach(sub => (sub.rbacPermissions || []).forEach(p => tutti.push(`${app.id}:${sub.id}:${p.id}`)));
                const tuttiAttivi = tutti.length > 0 && tutti.every(p => concessi.includes(p));
                const bloccato = currentTarget.isSuperadmin;

                let html = `
                    <div class="k-stack">
                        <div class="k-row" style="--k-gap: var(--k-space-3);">
                            <button class="k-btn k-btn--ghost k-btn--sm" data-azione="indietro"><span class="material-symbols-rounded">arrow_back</span>Tutte le app</button>
                        </div>
                        <div class="k-row" style="--k-gap: var(--k-space-3);">
                            ${iconaApp(app, 'width: 2rem; height: 2rem;')}
                            <h2 class="k-card-title" style="font-size: var(--k-font-xl);">${esc(app.name)}</h2>
                        </div>
                        ${bloccato ? `
                            <div class="k-alert k-alert--warning">
                                <span class="material-symbols-rounded">admin_panel_settings</span>
                                <div><strong>Super amministratore.</strong> Ha accesso illimitato a tutto il sistema: i permessi granulari sono ignorati e non si possono modificare.</div>
                            </div>` : ''}
                        <div class="k-card k-row k-row--between" style="background: var(--md-primary-container); border-color: transparent;">
                            <div>
                                <div style="font-weight: 600; color: var(--md-on-primary-container);">Accesso completo all'applicazione</div>
                                <div class="k-hint">Attiva o disattiva in un colpo tutti i permessi di questa app.</div>
                            </div>
                            ${interruttore(`data-global="${esc(appId)}" ${tuttiAttivi ? 'checked' : ''} ${bloccato ? 'disabled' : ''}`, 'Accesso completo')}
                        </div>`;

                if (app.rbacPermissions && app.rbacPermissions.length > 0) {
                    html += `
                        <section class="k-card k-card--flush">
                            ${app.rbacPermissions.map(p => {
                                const permId = `${app.id}:${p.id}`;
                                return rigaPermesso(permId, p.label || p.id, concessi.includes(permId), bloccato);
                            }).join('')}
                        </section>`;
                }

                subapps.forEach(sub => {
                    if (!sub.rbacPermissions || sub.rbacPermissions.length === 0) return;
                    html += `
                        <section class="k-section">
                            <h3 class="k-section-title k-row" style="--k-gap: var(--k-space-2); font-size: var(--k-font-base);">
                                <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.2rem;">${esc(sub.icon && !sub.icon.includes('.') ? sub.icon : 'extension')}</span>
                                ${esc(sub.name)}
                            </h3>
                            <div class="k-card k-card--flush">
                                ${sub.rbacPermissions.map(p => {
                                    const permId = `${app.id}:${sub.id}:${p.id}`;
                                    return rigaPermesso(permId, p.label || p.id, concessi.includes(permId), bloccato);
                                }).join('')}
                            </div>
                        </section>`;
                });

                if (tutti.length === 0) {
                    html += '<p class="k-hint">Questa applicazione non dichiara permessi specifici.</p>';
                }
                main.innerHTML = html + '</div>';
            } catch (e) {
                registraErrore(e);
                main.innerHTML = `<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>${esc(e.message)}</div></div>`;
            }
        };

        const togglePermission = async (permId, value) => {
            if (!currentTarget) return;
            try {
                if (currentTarget.type === 'group') {
                    await window.electronAPI.rbac.setGroupPermission(currentTarget.id, permId, value);
                } else {
                    await window.electronAPI.rbac.setUserPermission(currentTarget.id, permId, value);
                }
            } catch (e) {
                registraErrore(e);
                toast('Salvataggio del permesso non riuscito', 'error');
            }
        };

        const toggleAllAppPermissions = async (appId, value) => {
            if (!currentTarget) return;
            main.innerHTML = caricamento();
            try {
                const app = appsCache.find(a => a.id === appId);
                const subapps = subAppsCache[appId] || [];
                const operazioni = [];
                (app && app.rbacPermissions || []).forEach(p => operazioni.push(togglePermission(`${app.id}:${p.id}`, value)));
                subapps.forEach(sub => (sub.rbacPermissions || []).forEach(p => operazioni.push(togglePermission(`${app.id}:${sub.id}:${p.id}`, value))));
                await Promise.all(operazioni);
            } catch (e) {
                registraErrore(e);
            }
            openAppPermissions(appId);
        };

        const createNewGroup = () => {
            creaNuovoGruppoDialog({ onCreated: loadData, registraErrore });
        };

        const manageGroupMembers = () => {
            gestisciMembriGruppoDialog({
                currentTarget,
                allUsersCache,
                currentGroupUsers,
                onSaved: renderAppsGrid,
                registraErrore
            });
        };

        const openPermissionInspector = () => {
            apriIspettorePermessiDialog({
                appsCache,
                subAppsCache,
                allUsersCache,
                registraErrore
            });
        };

        sidebar.addEventListener('click', (e) => {
            const voce = e.target.closest('.k-list-item[data-type]');
            if (!voce) return;
            sidebar.querySelectorAll('.k-list-item').forEach(i => i.removeAttribute('aria-current'));
            voce.setAttribute('aria-current', 'true');
            currentTarget = {
                type: voce.dataset.type,
                id: voce.dataset.id,
                name: voce.dataset.name,
                isSuperadmin: voce.dataset.superadmin === '1'
            };
            renderAppsGrid();
        });

        el.querySelector('#rbac-search-input').addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            sidebar.querySelectorAll('.k-list-item[data-type]').forEach(voce => {
                voce.style.display = voce.dataset.name.toLowerCase().includes(query) ? '' : 'none';
            });
            sidebar.querySelectorAll('[data-intestazione]').forEach(h => { h.style.display = query ? 'none' : ''; });
        });

        main.addEventListener('click', (e) => {
            const app = e.target.closest('[data-app]');
            if (app) return openAppPermissions(app.dataset.app);
            const azione = e.target.closest('[data-azione]');
            if (!azione) return;
            if (azione.dataset.azione === 'indietro') renderAppsGrid();
            if (azione.dataset.azione === 'membri') manageGroupMembers();
        });

        main.addEventListener('change', (e) => {
            const permesso = e.target.closest('input[data-perm]');
            if (permesso) return togglePermission(permesso.dataset.perm, permesso.checked);
            const globale = e.target.closest('input[data-global]');
            if (globale) toggleAllAppPermissions(globale.dataset.global, globale.checked);
        });

        el.querySelector('#btn-add-group').addEventListener('click', createNewGroup);
        el.querySelector('#btn-inspect-permissions').addEventListener('click', openPermissionInspector);

        loadData();
    }
};
