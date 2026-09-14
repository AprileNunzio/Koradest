import { toast } from '../../../../js/utils.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

function interruttore(attributi, etichettaNascosta) {
    return `
        <label class="k-switch">
            <input type="checkbox" ${attributi} aria-label="${esc(etichettaNascosta)}">
            <span class="k-switch-track" aria-hidden="true"></span>
        </label>`;
}

function apriDialog({ titolo, icona, corpo, pulsanti, largo = false }) {
    const sfondo = document.createElement('div');
    sfondo.className = 'k-dialog-backdrop';
    sfondo.innerHTML = `
        <div class="k-dialog${largo ? ' k-dialog--lg' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titolo)}">
            <div class="k-dialog-header">
                <span class="k-page-icon material-symbols-rounded">${icona}</span>
                <h2 class="k-dialog-title" style="align-self: center;">${esc(titolo)}</h2>
            </div>
            <div class="k-dialog-body">${corpo}</div>
            <div class="k-dialog-footer">${pulsanti}</div>
        </div>`;
    const tasti = (e) => { if (e.key === 'Escape') chiudi(); };
    const chiudi = () => {
        document.removeEventListener('keydown', tasti);
        sfondo.remove();
    };
    document.addEventListener('keydown', tasti);
    sfondo.addEventListener('click', (e) => {
        if (e.target === sfondo || e.target.closest('[data-chiudi]')) chiudi();
    });
    document.body.appendChild(sfondo);
    return { el: sfondo, chiudi };
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
            const dialogo = apriDialog({
                titolo: 'Nuovo gruppo',
                icona: 'group_add',
                corpo: `
                    <div class="k-stack">
                        <div class="k-field">
                            <label class="k-label" for="rbac-new-group-name">Nome del gruppo</label>
                            <input type="text" id="rbac-new-group-name" class="k-input" placeholder="Es. Segreteria">
                        </div>
                        <div class="k-card k-card--muted k-row k-row--between" style="padding: var(--k-space-3) var(--k-space-4);">
                            <div>
                                <div style="font-weight: 600; color: var(--md-on-surface);">Membri super amministratori</div>
                                <div class="k-hint" style="color: var(--md-error);">Accesso totale al sistema per tutti i membri.</div>
                            </div>
                            ${interruttore('id="rbac-new-group-superadmin"', 'Super amministratori')}
                        </div>
                    </div>`,
                pulsanti: `
                    <button class="k-btn k-btn--ghost" data-chiudi>Annulla</button>
                    <button class="k-btn k-btn--primary" data-azione="crea">Crea gruppo</button>`
            });
            const input = dialogo.el.querySelector('#rbac-new-group-name');
            setTimeout(() => input.focus(), 30);
            const crea = async () => {
                const name = input.value.trim();
                if (!name) return;
                try {
                    const res = await window.electronAPI.rbac.createGroup(name, '', dialogo.el.querySelector('#rbac-new-group-superadmin').checked);
                    if (res) {
                        dialogo.chiudi();
                        toast('Gruppo creato', 'success');
                        loadData();
                    } else {
                        toast('Creazione del gruppo non riuscita', 'error');
                    }
                } catch (e) {
                    registraErrore(e);
                    toast('Creazione del gruppo non riuscita', 'error');
                }
            };
            dialogo.el.querySelector('[data-azione="crea"]').addEventListener('click', crea);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') crea(); });
        };

        const manageGroupMembers = () => {
            if (!currentTarget || currentTarget.type !== 'group') return;
            const dialogo = apriDialog({
                titolo: `Membri di ${currentTarget.name}`,
                icona: 'manage_accounts',
                corpo: allUsersCache.length === 0
                    ? '<p>Nessun utente disponibile.</p>'
                    : `<div class="k-card k-card--flush" style="max-height: 50vh; overflow-y: auto;">
                        ${allUsersCache.map(u => `
                            <div class="k-row k-row--between" style="padding: var(--k-space-2) var(--k-space-4); border-bottom: 1px solid var(--md-outline);">
                                <span class="k-row" style="--k-gap: var(--k-space-2); color: var(--md-on-surface);">
                                    <span class="k-avatar" style="--k-avatar-size: 1.75rem;">${esc((u.username || '?').charAt(0).toUpperCase())}</span>${esc(u.username)}
                                </span>
                                ${interruttore(`class="rbac-member-checkbox" value="${esc(u.id)}" ${currentGroupUsers.includes(u.id) ? 'checked' : ''}`, u.username)}
                            </div>`).join('')}
                    </div>`,
                pulsanti: `
                    <button class="k-btn k-btn--ghost" data-chiudi>Annulla</button>
                    <button class="k-btn k-btn--primary" data-azione="salva-membri">Salva membri</button>`
            });
            dialogo.el.querySelector('[data-azione="salva-membri"]').addEventListener('click', async () => {
                const selezionati = Array.from(dialogo.el.querySelectorAll('.rbac-member-checkbox:checked')).map(cb => cb.value);
                try {
                    const res = await window.electronAPI.rbac.updateGroupUsers(currentTarget.id, selezionati);
                    if (res) {
                        dialogo.chiudi();
                        renderAppsGrid();
                        toast('Membri aggiornati', 'success');
                    } else {
                        toast('Aggiornamento dei membri non riuscito', 'error');
                    }
                } catch (e) {
                    registraErrore(e);
                    toast('Aggiornamento dei membri non riuscito', 'error');
                }
            });
        };

        const openPermissionInspector = () => {
            const opzioniPermessi = (appId) => {
                const app = appsCache.find(a => a.id === appId);
                if (!app) return '<option value="">Nessun permesso specifico</option>';
                const voci = [];
                (app.rbacPermissions || []).forEach(p => voci.push(`<option value="${esc(`${app.id}:${p.id}`)}">${esc(p.label || p.id)}</option>`));
                (subAppsCache[appId] || []).forEach(sub => (sub.rbacPermissions || []).forEach(p => {
                    voci.push(`<option value="${esc(`${app.id}:${sub.id}:${p.id}`)}">${esc(sub.name)} → ${esc(p.label || p.id)}</option>`);
                }));
                return voci.join('') || '<option value="">Nessun permesso specifico</option>';
            };
            const dialogo = apriDialog({
                titolo: 'Ispettore permessi',
                icona: 'find_in_page',
                largo: true,
                corpo: `
                    <div class="k-stack">
                        <p>Calcola se un utente possiede un permesso e da dove lo eredita.</p>
                        <div class="k-form-grid">
                            <div class="k-field">
                                <label class="k-label" for="inspect-user-select">Utente</label>
                                <select id="inspect-user-select" class="k-select">
                                    ${allUsersCache.map(u => `<option value="${esc(u.id)}">${esc(u.username)}${u.email ? ` (${esc(u.email)})` : ''}</option>`).join('') || '<option value="">Nessun utente</option>'}
                                </select>
                            </div>
                            <div class="k-field">
                                <label class="k-label" for="inspect-app-select">Applicazione</label>
                                <select id="inspect-app-select" class="k-select">
                                    ${appsCache.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('') || '<option value="">Nessuna applicazione</option>'}
                                </select>
                            </div>
                            <div class="k-field k-field--full">
                                <label class="k-label" for="inspect-perm-select">Permesso</label>
                                <select id="inspect-perm-select" class="k-select">${appsCache.length ? opzioniPermessi(appsCache[0].id) : ''}</select>
                            </div>
                        </div>
                        <div id="inspect-result-card"></div>
                    </div>`,
                pulsanti: `
                    <button class="k-btn k-btn--ghost" data-chiudi>Chiudi</button>
                    <button class="k-btn k-btn--primary" data-azione="calcola"><span class="material-symbols-rounded">manage_search</span>Calcola origine</button>`
            });
            const d = dialogo.el;
            d.querySelector('#inspect-app-select').addEventListener('change', (e) => {
                d.querySelector('#inspect-perm-select').innerHTML = opzioniPermessi(e.target.value);
            });
            d.querySelector('[data-azione="calcola"]').addEventListener('click', async () => {
                const userId = d.querySelector('#inspect-user-select').value;
                const permissionId = d.querySelector('#inspect-perm-select').value;
                const risultato = d.querySelector('#inspect-result-card');
                if (!userId || !permissionId) return;
                risultato.innerHTML = caricamento();
                try {
                    const res = await window.electronAPI.rbac.inspectTrace({ userId, permissionId });
                    const concesso = Boolean(res && res.granted);
                    risultato.innerHTML = `
                        <div class="k-alert k-alert--${concesso ? 'success' : 'danger'}">
                            <span class="material-symbols-rounded">${concesso ? 'check_circle' : 'cancel'}</span>
                            <div class="k-stack" style="--k-gap: 2px;">
                                <strong>${concesso ? 'Permesso concesso' : 'Permesso negato'}</strong>
                                <span>Origine: ${esc((res && res.source) || 'sconosciuta')}</span>
                                ${res && res.trace ? `<span class="k-hint">${esc(res.trace)}</span>` : ''}
                            </div>
                        </div>`;
                } catch (e) {
                    registraErrore(e);
                    risultato.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Calcolo non riuscito.</div></div>';
                }
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
