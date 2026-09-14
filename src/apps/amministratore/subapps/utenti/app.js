import { toast, conferma, avviso } from '../../../../js/utils.js';

const CF_CODICI_DISPARI = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};
const CF_CODICI_PARI = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};
const CF_RESTO_LETTERA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const CF_REGEX = /^[A-Z]{6}[0-9]{2}[A-EHLMPR-T][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
function isValidCodiceFiscale(value) {
    const cf = (value || '').trim().toUpperCase();
    if (!CF_REGEX.test(cf)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
        const ch = cf[i];
        sum += (i % 2 === 0) ? CF_CODICI_DISPARI[ch] : CF_CODICI_PARI[ch];
    }
    return CF_RESTO_LETTERA[sum % 26] === cf[15];
}

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const campo = (id, etichetta, attributi, pieno = false) => `
    <div class="k-field${pieno ? ' k-field--full' : ''}">
        <label class="k-label" for="${id}">${etichetta}</label>
        <input id="${id}" class="k-input" ${attributi}>
    </div>`;

export default {
    render: async (el) => {
        el.innerHTML = `
            <div class="k-page fade-in-up">
                <header class="k-page-header">
                    <div class="k-page-heading">
                        <span class="k-page-icon material-symbols-rounded">group</span>
                        <div>
                            <h1 class="k-page-title">Gestione utenti</h1>
                            <p class="k-page-subtitle">Account, credenziali e accesso degli utenti a questa rete.</p>
                        </div>
                    </div>
                    <div class="k-page-actions" style="flex: 1 1 24rem; justify-content: flex-end;">
                        <div class="k-input-group" style="flex: 1 1 14rem; max-width: 20rem;">
                            <span class="material-symbols-rounded">search</span>
                            <input type="search" id="user-search" class="k-input" placeholder="Cerca per nome o email..." aria-label="Cerca utente">
                        </div>
                        <button id="btn-add-user" class="k-btn k-btn--primary">
                            <span class="material-symbols-rounded">person_add</span>Nuovo utente
                        </button>
                    </div>
                </header>

                <section class="k-card k-row k-row--between" id="twofa-policy-banner">
                    <div class="k-row" style="--k-gap: var(--k-space-3); flex: 1 1 20rem;">
                        <span class="k-stat-icon material-symbols-rounded" style="background: var(--md-success-container); color: var(--md-success);">verified_user</span>
                        <div>
                            <div style="font-weight: 600;">Richiedi la verifica in due passaggi</div>
                            <div class="k-hint">Rende obbligatoria l'attivazione di TOTP o Passkey per ogni account della rete.</div>
                        </div>
                    </div>
                    <label class="k-switch">
                        <input type="checkbox" id="twofa-policy-toggle" aria-label="Richiedi 2FA per tutti gli utenti">
                        <span class="k-switch-track" aria-hidden="true"></span>
                    </label>
                </section>

                <div id="users-content">
                    <div class="k-card k-loading"><div class="k-spinner"></div></div>
                </div>
            </div>

            <div id="user-modal" class="k-dialog-backdrop" style="display: none;">
                <div class="k-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <form id="user-form" novalidate style="display: contents;">
                        <div class="k-dialog-header">
                            <span class="k-page-icon material-symbols-rounded">badge</span>
                            <h2 id="modal-title" class="k-dialog-title" style="flex: 1; align-self: center;">Nuovo utente</h2>
                            <button type="button" id="btn-close-modal" class="k-btn k-btn--ghost k-btn--icon k-btn--sm" aria-label="Chiudi"><span class="material-symbols-rounded">close</span></button>
                        </div>
                        <div class="k-dialog-body">
                            <input type="hidden" id="user-id">
                            <div class="k-form-grid">
                                ${campo('user-nome', 'Nome', 'type="text" required autocomplete="given-name"')}
                                ${campo('user-cognome', 'Cognome', 'type="text" required autocomplete="family-name"')}
                                <div class="k-field k-field--full">
                                    <label class="k-label" for="user-cf">Codice fiscale</label>
                                    <input id="user-cf" class="k-input" type="text" required style="text-transform: uppercase; font-family: var(--font-mono); letter-spacing: 0.04em;" maxlength="16">
                                    <span class="k-hint">Collega l'utente alla sua anagrafica personale.</span>
                                </div>
                                ${campo('user-email', 'Email', 'type="email" autocomplete="email"', true)}
                                ${campo('user-pin', 'PIN', 'type="text" inputmode="numeric" placeholder="Es. 1234" autocomplete="off"')}
                                ${campo('user-password', 'Password', 'type="password" autocomplete="new-password"')}
                            </div>
                            <div id="modal-error" class="k-alert k-alert--danger" style="display: none; margin-top: var(--k-space-4);"></div>
                        </div>
                        <div class="k-dialog-footer">
                            <button type="button" id="btn-cancel-modal" class="k-btn k-btn--ghost">Annulla</button>
                            <button type="submit" id="btn-save-modal" class="k-btn k-btn--primary">Salva</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const tabContent = el.querySelector('#users-content');
        const searchInput = el.querySelector('#user-search');
        const modal = el.querySelector('#user-modal');
        const form = el.querySelector('#user-form');
        const modalError = el.querySelector('#modal-error');
        const actorUserId = sessionStorage.getItem('currentUserId');
        const policyToggle = el.querySelector('#twofa-policy-toggle');
        let rawUsers = [];

        const haDueFattori = (u) => Boolean(u.totpEnabled || u.passkeysCount > 0);

        const cardUtente = (u) => {
            const bloccato = u.is_deleted === 1;
            const ultimoAccesso = u.last_login > 0 ? new Date(u.last_login).toLocaleString('it-IT') : 'mai';
            return `
                <article class="k-card" style="display: flex; flex-direction: column; gap: var(--k-space-3); ${bloccato ? 'opacity: 0.75;' : ''}">
                    <div class="k-row" style="--k-gap: var(--k-space-3); align-items: flex-start; flex-wrap: nowrap;">
                        <span class="k-avatar" style="--k-avatar-size: 2.75rem; ${bloccato ? 'background: var(--md-error-container); color: var(--md-error);' : ''}">${esc((u.username || '?').charAt(0).toUpperCase())}</span>
                        <div style="flex: 1; min-width: 0;">
                            <div class="k-truncate" style="font-weight: 600;">${esc(u.username)}</div>
                            <div class="k-hint k-truncate">${esc(u.email || 'Nessuna email')}</div>
                        </div>
                        <span class="k-badge k-badge--${bloccato ? 'danger' : 'success'}"><span class="k-dot"></span>${bloccato ? 'Bloccato' : 'Attivo'}</span>
                    </div>
                    <div class="k-row" style="--k-gap: var(--k-space-1);">
                        <span class="k-badge${u.is_superadmin ? ' k-badge--primary' : ''}">${u.is_superadmin ? 'Amministratore' : 'Utente'}</span>
                        <span class="k-badge${haDueFattori(u) ? ' k-badge--success' : ''}"><span class="material-symbols-rounded">verified_user</span>${haDueFattori(u) ? '2FA attiva' : '2FA non attiva'}</span>
                        ${u.must_change_password ? '<span class="k-badge k-badge--warning">Deve cambiare password</span>' : ''}
                    </div>
                    <div class="k-hint k-row" style="--k-gap: var(--k-space-1);"><span class="material-symbols-rounded" style="font-size: 0.95rem;">history</span>Ultimo accesso: ${esc(ultimoAccesso)}</div>
                    <div class="k-row k-row--end" style="--k-gap: var(--k-space-1); border-top: 1px solid var(--md-outline); padding-top: var(--k-space-2); margin-top: auto;">
                        <button class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-azione="modifica" data-id="${esc(u.id)}" title="Ripristina credenziali" aria-label="Ripristina credenziali"><span class="material-symbols-rounded">key</span></button>
                        ${haDueFattori(u) ? `<button class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-azione="reset-2fa" data-id="${esc(u.id)}" title="Azzera 2FA" aria-label="Azzera 2FA"><span class="material-symbols-rounded">restart_alt</span></button>` : ''}
                        ${bloccato
                            ? `<button class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-azione="sblocca" data-id="${esc(u.id)}" title="Sblocca utente" aria-label="Sblocca utente"><span class="material-symbols-rounded">lock_open</span></button>`
                            : `<button class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-azione="blocca" data-id="${esc(u.id)}" title="Blocca accesso" aria-label="Blocca accesso" style="color: var(--md-error);"><span class="material-symbols-rounded">block</span></button>`}
                        <button class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-azione="elimina" data-id="${esc(u.id)}" title="Elimina definitivamente" aria-label="Elimina definitivamente" style="color: var(--md-error);"><span class="material-symbols-rounded">delete_forever</span></button>
                    </div>
                </article>`;
        };

        const renderUsers = (filter = '') => {
            if (rawUsers.length === 0) {
                tabContent.innerHTML = `
                    <div class="k-card k-empty">
                        <span class="material-symbols-rounded">group_off</span>
                        <div class="k-empty-title">Nessun utente</div>
                        <p class="k-empty-text">Crea il primo utente con il pulsante "Nuovo utente".</p>
                    </div>`;
                return;
            }
            const cerca = filter.toLowerCase();
            const filtered = rawUsers.filter(u =>
                String(u.username || '').toLowerCase().includes(cerca) ||
                (u.email && u.email.toLowerCase().includes(cerca))
            );
            if (filtered.length === 0) {
                tabContent.innerHTML = `
                    <div class="k-card k-empty">
                        <span class="material-symbols-rounded">search_off</span>
                        <div class="k-empty-title">Nessun utente corrisponde alla ricerca</div>
                    </div>`;
                return;
            }
            tabContent.innerHTML = `<div class="k-grid" style="--k-grid-min: 17rem;">${filtered.map(cardUtente).join('')}</div>`;
        };

        const loadUsers = async (filterText = '') => {
            try {
                const utenti = await window.electronAPI.usersGetAll();
                rawUsers = Array.isArray(utenti) ? utenti : [];
                try {
                    const twofaRes = await window.electronAPI.twofa.adminListStatus(actorUserId);
                    if (twofaRes && twofaRes.success && Array.isArray(twofaRes.users)) {
                        const byId = {};
                        twofaRes.users.forEach(u => { byId[u.id] = u; });
                        rawUsers = rawUsers.map(u => ({ ...u, totpEnabled: byId[u.id] ? byId[u.id].totpEnabled : false, passkeysCount: byId[u.id] ? byId[u.id].passkeysCount : 0 }));
                        if (policyToggle) policyToggle.checked = rawUsers.length > 0 && twofaRes.users.every(u => u.twofaRequired);
                    }
                } catch (e) {
                    console.error('[Utenti] Stato 2FA non disponibile:', e);
                }
                renderUsers(filterText);
            } catch (err) {
                tabContent.innerHTML = `<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Caricamento non riuscito: ${esc(err.message)}</div></div>`;
            }
        };

        const unicoSuperAdmin = async (id) => {
            const rolesData = await window.electronAPI.rbac.getAllUsers();
            const elenco = Array.isArray(rolesData) ? rolesData : [];
            const utente = elenco.find(r => r.id === id);
            const eSuper = (u) => u.roles && u.roles.some(role => role.name === 'Super Admin');
            return Boolean(utente && eSuper(utente) && elenco.filter(eSuper).length <= 1);
        };

        const AZIONI = {
            modifica: async (id) => {
                const user = rawUsers.find(ru => ru.id === id);
                if (user) openModal(user);
            },
            blocca: async (id) => {
                if (id === sessionStorage.getItem('currentUserId')) {
                    return avviso({ titolo: 'Azione non consentita', testo: 'Non puoi bloccare il tuo stesso account.', tono: 'pericolo' });
                }
                if (await unicoSuperAdmin(id)) {
                    return avviso({ titolo: 'Azione non consentita', testo: 'Questo è l\'unico super amministratore attivo: bloccandolo perderesti il controllo della rete.', tono: 'pericolo' });
                }
                if (!(await conferma({ titolo: 'Bloccare questo utente?', testo: 'Non potrà più accedere finché non lo sblocchi.', etichetta: 'Blocca', pericolosa: true }))) return;
                await window.electronAPI.usersDelete({ id });
                toast('Utente bloccato', 'success');
                await loadUsers(searchInput.value);
            },
            sblocca: async (id) => {
                if (!(await conferma({ titolo: 'Sbloccare questo utente?', testo: 'Potrà di nuovo accedere alla rete.', etichetta: 'Sblocca' }))) return;
                await window.electronAPI.usersRestore({ id });
                toast('Utente sbloccato', 'success');
                await loadUsers(searchInput.value);
            },
            'reset-2fa': async (id) => {
                if (!(await conferma({ titolo: 'Azzerare la 2FA?', testo: 'L\'utente dovrà configurare di nuovo TOTP o Passkey al prossimo accesso.', etichetta: 'Azzera 2FA', pericolosa: true }))) return;
                const r = await window.electronAPI.twofa.adminReset({ actorUserId, targetUserId: id });
                if (r && r.success) {
                    toast('2FA azzerata', 'success');
                    await loadUsers(searchInput.value);
                } else {
                    toast((r && r.error) || 'Azzeramento non riuscito', 'error');
                }
            },
            elimina: async (id) => {
                if (id === sessionStorage.getItem('currentUserId')) {
                    return avviso({ titolo: 'Azione non consentita', testo: 'Non puoi eliminare il tuo stesso account.', tono: 'pericolo' });
                }
                const ok = await conferma({
                    titolo: 'Eliminare definitivamente questo utente?',
                    testo: 'Il record verrà cancellato da questo database e da tutti i nodi connessi.\nL\'operazione è irreversibile.',
                    etichetta: 'Elimina definitivamente',
                    pericolosa: true
                });
                if (!ok) return;
                await window.electronAPI.usersHardDelete({ id });
                toast('Utente eliminato', 'success');
                await loadUsers(searchInput.value);
            }
        };

        tabContent.addEventListener('click', async (e) => {
            const pulsante = e.target.closest('[data-azione]');
            if (!pulsante || !AZIONI[pulsante.dataset.azione]) return;
            try {
                await AZIONI[pulsante.dataset.azione](pulsante.dataset.id);
            } catch (err) {
                toast('Errore: ' + err.message, 'error');
            }
        });

        if (policyToggle) {
            policyToggle.addEventListener('change', async () => {
                const r = await window.electronAPI.twofa.setPolicy({ actorUserId, required: policyToggle.checked });
                if (r && r.success) {
                    toast('Regola 2FA aggiornata', 'success');
                } else {
                    toast((r && r.error) || 'Aggiornamento della regola non riuscito', 'error');
                    policyToggle.checked = !policyToggle.checked;
                }
            });
        }

        searchInput.addEventListener('input', (e) => renderUsers(e.target.value));

        const openModal = (user = null) => {
            modalError.style.display = 'none';
            const cfInput = el.querySelector('#user-cf');
            const password = el.querySelector('#user-password');
            if (user) {
                el.querySelector('#modal-title').textContent = 'Ripristina credenziali';
                el.querySelector('#user-id').value = user.id;
                el.querySelector('#user-nome').value = user.nome || '';
                el.querySelector('#user-cognome').value = user.cognome || '';
                el.querySelector('#user-email').value = user.email || '';
                el.querySelector('#user-pin').value = user.pin || '';
                password.value = '';
                password.placeholder = 'Lascia vuoto per non cambiarla';
                password.required = false;
                cfInput.value = user.codice_fiscale || 'Non associato';
                cfInput.disabled = true;
                cfInput.required = false;
            } else {
                el.querySelector('#modal-title').textContent = 'Nuovo utente';
                form.reset();
                el.querySelector('#user-id').value = '';
                password.placeholder = 'Obbligatoria';
                password.required = true;
                cfInput.disabled = false;
                cfInput.required = true;
            }
            modal.style.display = 'grid';
            setTimeout(() => el.querySelector('#user-nome').focus(), 30);
        };
        const closeModal = () => { modal.style.display = 'none'; };

        el.querySelector('#btn-add-user').addEventListener('click', () => openModal());
        el.querySelector('#btn-close-modal').addEventListener('click', closeModal);
        el.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            modalError.style.display = 'none';
            const btnSave = el.querySelector('#btn-save-modal');
            btnSave.setAttribute('aria-busy', 'true');
            try {
                const id = el.querySelector('#user-id').value;
                const data = {
                    nome: el.querySelector('#user-nome').value,
                    cognome: el.querySelector('#user-cognome').value,
                    email: el.querySelector('#user-email').value,
                    pin: el.querySelector('#user-pin').value,
                    password: el.querySelector('#user-password').value
                };
                if (!data.nome.trim() || !data.cognome.trim()) throw new Error('Nome e cognome sono obbligatori.');
                if (id) {
                    data.id = id;
                    await window.electronAPI.usersUpdate(data);
                } else {
                    const codiceFiscale = el.querySelector('#user-cf').value.trim().toUpperCase();
                    if (!isValidCodiceFiscale(codiceFiscale)) throw new Error('Inserisci un codice fiscale valido.');
                    if (!data.password) throw new Error('La password è obbligatoria per un nuovo utente.');
                    data.codice_fiscale = codiceFiscale;
                    await window.electronAPI.usersCreate(data);
                }
                closeModal();
                toast(id ? 'Credenziali aggiornate' : 'Utente creato', 'success');
                await loadUsers(searchInput.value);
            } catch (err) {
                modalError.innerHTML = `<span class="material-symbols-rounded">error</span><div>${esc(err.message || 'Salvataggio non riuscito.')}</div>`;
                modalError.style.display = 'flex';
            } finally {
                btnSave.removeAttribute('aria-busy');
            }
        });

        loadUsers();
    }
};
