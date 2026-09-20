import { toast } from '../../../../js/utils.js';

export const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function interruttore(attributi, etichettaNascosta) {
    try {
        return `
            <label class="k-switch">
                <input type="checkbox" ${attributi} aria-label="${esc(etichettaNascosta)}">
                <span class="k-switch-track" aria-hidden="true"></span>
            </label>`;
    } catch (e) {
        return '';
    }
}

export function apriDialog({ titolo, icona, corpo, pulsanti, largo = false, ancora = null }) {
    try {
        const ospite = ancora || document.getElementById('app-mount-point') || document.getElementById('main-content') || document.body;
        const esistente = ospite.querySelector(':scope > .k-riquadro-linea');
        if (esistente) esistente.remove();
        const riquadro = document.createElement('section');
        riquadro.className = `k-riquadro-linea${largo ? ' k-riquadro-linea--largo' : ''}`;
        riquadro.setAttribute('role', 'group');
        riquadro.setAttribute('aria-label', titolo);
        riquadro.innerHTML = `
            <div class="k-card">
                <div class="k-card-header">
                    <div class="k-card-title"><span class="material-symbols-rounded">${icona}</span><span>${esc(titolo)}</span></div>
                    <button type="button" class="k-btn k-btn--ghost k-btn--sm" data-chiudi>
                        <span class="material-symbols-rounded">arrow_back</span>Chiudi
                    </button>
                </div>
                <div>${corpo}</div>
                <div class="k-card-footer">${pulsanti}</div>
            </div>`;
        const tasti = (e) => { if (e.key === 'Escape') chiudi(); };
        const chiudi = () => {
            document.removeEventListener('keydown', tasti);
            riquadro.remove();
        };
        document.addEventListener('keydown', tasti);
        riquadro.addEventListener('click', (e) => {
            if (e.target.closest('[data-chiudi]')) chiudi();
        });
        ospite.prepend(riquadro);
        riquadro.scrollIntoView({ block: 'nearest' });
        return { el: riquadro, chiudi };
    } catch (e) {
        console.error('[RBAC] Riquadro non aperto:', e);
        return { el: null, chiudi: () => {} };
    }
}

export function creaNuovoGruppoDialog({ onCreated, registraErrore }) {
    try {
        const dialogo = apriDialog({
            titolo: 'Nuovo gruppo',
            icona: 'group_add',
            corpo: `
                <div class="k-stack">
                    <div class="k-field">
                        <label class="k-label" for="rbac-new-group-name">Nome del gruppo</label>
                        <input id="rbac-new-group-name" class="k-input" type="text" placeholder="Es. Amministrazione, Docenti, Supporto..." autocomplete="off">
                    </div>
                    <div class="k-card k-row k-row--between" style="padding: var(--k-space-3);">
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
                    if (onCreated) onCreated();
                } else {
                    toast('Creazione del gruppo non riuscita', 'error');
                }
            } catch (e) {
                if (registraErrore) registraErrore(e);
                toast('Creazione del gruppo non riuscita', 'error');
            }
        };
        dialogo.el.querySelector('[data-azione="crea"]').addEventListener('click', crea);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') crea(); });
    } catch (e) {
        if (registraErrore) registraErrore(e);
    }
}

export function gestisciMembriGruppoDialog({ currentTarget, allUsersCache, currentGroupUsers, onSaved, registraErrore }) {
    try {
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
                    if (onSaved) onSaved();
                    toast('Membri aggiornati', 'success');
                } else {
                    toast('Aggiornamento dei membri non riuscito', 'error');
                }
            } catch (e) {
                if (registraErrore) registraErrore(e);
                toast('Aggiornamento dei membri non riuscito', 'error');
            }
        });
    } catch (e) {
        if (registraErrore) registraErrore(e);
    }
}

export function apriIspettorePermessiDialog({ appsCache, subAppsCache, allUsersCache, registraErrore }) {
    try {
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
                <button class="k-btn k-btn--primary" id="btn-run-inspect">Verifica permesso</button>`
        });
        const d = dialogo.el;
        d.querySelector('#inspect-app-select').addEventListener('change', (e) => {
            d.querySelector('#inspect-perm-select').innerHTML = opzioniPermessi(e.target.value);
        });
        d.querySelector('#btn-run-inspect').addEventListener('click', async () => {
            const userId = d.querySelector('#inspect-user-select').value;
            const permissionId = d.querySelector('#inspect-perm-select').value;
            const risultato = d.querySelector('#inspect-result-card');
            if (!userId || !permissionId) return;
            risultato.innerHTML = '<div class="k-loading" style="padding: 1rem;"><div class="k-spinner"></div></div>';
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
                if (registraErrore) registraErrore(e);
                risultato.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Calcolo non riuscito.</div></div>';
            }
        });
    } catch (e) {
        if (registraErrore) registraErrore(e);
    }
}
