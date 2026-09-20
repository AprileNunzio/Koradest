import { toast } from '../utils.js';
import { startRegistration, isWebauthnSupported } from '../webauthn_client.js';
import { esc } from './html.js';

const immagineSicura = (valore) => (/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(String(valore ?? '')) ? String(valore) : '');
function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Date(Number(ts)).toLocaleString('it-IT'); } catch (e) { return '—'; }
}

async function render(el, userId) {
    el.innerHTML = `
        <div id="tfp-totp-card" class="tfp-card"></div>
        <div id="tfp-passkey-card" class="tfp-card"></div>
    `;
    async function loadTotp() {
        const card = el.querySelector('#tfp-totp-card');
        card.innerHTML = `<div style="text-align:center; padding:1rem;"><span class="material-symbols-rounded" style="animation: spin 2s linear infinite;">sync</span></div>`;
        const status = await window.electronAPI.twofa.getStatus(userId);
        if (!status || !status.success) {
            card.innerHTML = `<p style="color: var(--md-error);">Errore nel caricamento dello stato 2FA.</p>`;
            return;
        }
        if (status.totpEnabled) {
            card.innerHTML = `
                <h2><span class="material-symbols-rounded">password</span> Autenticazione TOTP <span class="tfp-status-ok"><span class="material-symbols-rounded" style="font-size:1rem;">check_circle</span> Attiva</span></h2>
                <p class="tfp-desc">L'app di autenticazione (es. Google Authenticator) è collegata al tuo account.</p>
                <button id="tfp-totp-disable" class="tfp-btn danger"><span class="material-symbols-rounded">lock_open</span> Disattiva TOTP</button>
            `;
            card.querySelector('#tfp-totp-disable').addEventListener('click', () => renderTotpDisableForm(card));
        } else {
            card.innerHTML = `
                <h2><span class="material-symbols-rounded">password</span> Autenticazione TOTP <span class="tfp-status-off">Non attiva</span></h2>
                <p class="tfp-desc">Collega un'app come Google Authenticator, Microsoft Authenticator o Authy per proteggere il login con un codice a 6 cifre.</p>
                <button id="tfp-totp-enable" class="tfp-btn"><span class="material-symbols-rounded">qr_code_2</span> Attiva TOTP</button>
            `;
            card.querySelector('#tfp-totp-enable').addEventListener('click', () => renderTotpEnrollment(card));
        }
    }
    function renderTotpDisableForm(card) {
        card.insertAdjacentHTML('beforeend', `
            <div id="tfp-totp-disable-form" style="margin-top:1rem;">
                <input type="password" id="tfp-totp-disable-password" class="tfp-input" placeholder="Conferma la tua password">
                <button id="tfp-totp-disable-confirm" class="tfp-btn danger">Conferma disattivazione</button>
            </div>
        `);
        card.querySelector('#tfp-totp-disable-confirm').addEventListener('click', async () => {
            const password = card.querySelector('#tfp-totp-disable-password').value;
            const r = await window.electronAPI.twofa.totpDisable({ userId, password });
            if (r && r.success) { toast('TOTP disattivato', 'success'); loadTotp(); }
            else toast((r && r.error) || 'Errore disattivazione', 'error');
        });
    }
    async function renderTotpEnrollment(card) {
        card.innerHTML = `<div style="text-align:center; padding:1rem;"><span class="material-symbols-rounded" style="animation: spin 2s linear infinite;">sync</span></div>`;
        const begin = await window.electronAPI.twofa.totpSetupBegin(userId);
        if (!begin || !begin.success) { toast((begin && begin.error) || 'Errore avvio configurazione TOTP', 'error'); loadTotp(); return; }
        card.innerHTML = `
            <h2><span class="material-symbols-rounded">qr_code_2</span> Configura TOTP</h2>
            <p class="tfp-desc">Scansiona il QR code con la tua app di autenticazione, poi inserisci il codice a 6 cifre per confermare.</p>
            <div style="text-align:center; margin: 1rem 0;">
                <img src="${immagineSicura(begin.qrDataUrl)}" alt="QR TOTP" style="width:200px; height:200px; border-radius:12px; border:1px solid var(--md-outline-variant);">
                <p style="font-family: monospace; font-size: 0.85rem; color: var(--md-on-surface-variant); word-break: break-all; margin-top: 0.5rem;">${esc(begin.secret)}</p>
            </div>
            <input type="text" id="tfp-totp-code" class="tfp-input" placeholder="Codice a 6 cifre" maxlength="6" inputmode="numeric">
            <div style="display:flex; gap:0.8rem;">
                <button id="tfp-totp-confirm" class="tfp-btn"><span class="material-symbols-rounded">check</span> Conferma</button>
                <button id="tfp-totp-cancel" class="tfp-btn secondary">Annulla</button>
            </div>
        `;
        card.querySelector('#tfp-totp-cancel').addEventListener('click', loadTotp);
        card.querySelector('#tfp-totp-confirm').addEventListener('click', async () => {
            const code = card.querySelector('#tfp-totp-code').value;
            const r = await window.electronAPI.twofa.totpSetupConfirm({ userId, secret: begin.secret, code });
            if (r && r.success) {
                card.innerHTML = `
                    <h2><span class="material-symbols-rounded">verified</span> TOTP attivato</h2>
                    <p class="tfp-desc">Conserva questi codici di backup in un luogo sicuro: potrai usarli se perdi l'accesso alla tua app di autenticazione. Ogni codice è utilizzabile una sola volta.</p>
                    <div class="tfp-backup-codes">${(Array.isArray(r.backupCodes) ? r.backupCodes : []).map(c => `<div>${esc(c)}</div>`).join('')}</div>
                    <button id="tfp-totp-done" class="tfp-btn">Ho salvato i codici</button>
                `;
                card.querySelector('#tfp-totp-done').addEventListener('click', loadTotp);
            } else {
                toast((r && r.error) || 'Codice non valido', 'error');
            }
        });
    }
    async function loadPasskeys() {
        const card = el.querySelector('#tfp-passkey-card');
        card.innerHTML = `<div style="text-align:center; padding:1rem;"><span class="material-symbols-rounded" style="animation: spin 2s linear infinite;">sync</span></div>`;
        const status = await window.electronAPI.twofa.getStatus(userId);
        const passkeys = (status && status.success && Array.isArray(status.passkeys)) ? status.passkeys : [];
        const supported = isWebauthnSupported();
        card.innerHTML = `
            <h2><span class="material-symbols-rounded">fingerprint</span> Passkey</h2>
            <p class="tfp-desc">Accedi con Windows Hello, impronta digitale o una chiave di sicurezza, senza inserire codici.</p>
            ${!supported ? `<p style="color: var(--md-error); font-size: 0.85rem;">Le Passkey non sono disponibili su questa installazione (richiede caricamento via server locale).</p>` : ''}
            ${passkeys.length === 0 ? `<p style="color: var(--md-on-surface-variant); font-size: 0.9rem;">Nessuna passkey registrata.</p>` : passkeys.map(p => `
                <div class="tfp-passkey-row">
                    <span class="material-symbols-rounded" style="color: var(--md-primary);">devices</span>
                    <div style="flex:1;">
                        <div style="font-weight:600;">${esc(p.deviceName)}</div>
                        <div style="font-size:0.8rem; color: var(--md-on-surface-variant);">Aggiunta il ${fmtDate(p.createdAt)}${p.lastUsedAt ? ` · Ultimo utilizzo ${fmtDate(p.lastUsedAt)}` : ''}</div>
                    </div>
                    <button class="tfp-btn danger" data-remove="${esc(p.id)}" style="padding: 0.5rem 0.9rem;"><span class="material-symbols-rounded" style="font-size:1.1rem;">delete</span></button>
                </div>
            `).join('')}
            <button id="tfp-passkey-add" class="tfp-btn" style="margin-top:1rem;" ${!supported ? 'disabled' : ''}><span class="material-symbols-rounded">add</span> Aggiungi Passkey</button>
        `;
        card.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const { confermaInLinea } = await import('./conferma_inline.js');
                if (!(await confermaInLinea(btn, { testo: 'Rimuovere questa passkey? Il dispositivo non potrà più essere usato per accedere.', etichetta: 'Rimuovi' }))) return;
                const r = await window.electronAPI.twofa.webauthnRemove({ userId, credentialRowId: btn.getAttribute('data-remove') });
                if (r && r.success) { toast('Passkey rimossa', 'success'); loadPasskeys(); }
                else toast((r && r.error) || 'Errore rimozione', 'error');
            });
        });
        const addBtn = card.querySelector('#tfp-passkey-add');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                try {
                    const begin = await window.electronAPI.twofa.webauthnRegisterBegin(userId);
                    if (!begin || !begin.success) { toast((begin && begin.error) || 'Errore avvio registrazione passkey', 'error'); return; }
                    toast('Segui le istruzioni del tuo dispositivo per completare la registrazione…', 'info');
                    const response = await startRegistration(begin.options);
                    
                    card.innerHTML = `
                        <h2><span class="material-symbols-rounded">fingerprint</span> Nome Passkey</h2>
                        <p class="tfp-desc">Assegna un nome per riconoscere questo dispositivo (es. "Portatile Ufficio").</p>
                        <input type="text" id="tfp-passkey-name" class="tfp-input" value="${begin.defaultDeviceName || navigator.platform || 'Passkey'}">
                        <div style="display:flex; gap:0.8rem;">
                            <button id="tfp-passkey-name-confirm" class="tfp-btn"><span class="material-symbols-rounded">check</span> Salva</button>
                        </div>
                    `;
                    
                    card.querySelector('#tfp-passkey-name-confirm').addEventListener('click', async () => {
                        try {
                            const deviceName = card.querySelector('#tfp-passkey-name').value.trim() || 'Passkey';
                            const finish = await window.electronAPI.twofa.webauthnRegisterFinish({ userId, response, deviceName });
                            if (finish && finish.success) { toast('Passkey registrata con successo', 'success'); loadPasskeys(); }
                            else { toast((finish && finish.error) || 'Registrazione passkey fallita', 'error'); loadPasskeys(); }
                        } catch(e) {
                            console.error(e);
                            toast(e.message || 'Errore', 'error');
                            loadPasskeys();
                        }
                    });
                } catch (e) {
                    console.error(e);
                    toast(e.message || 'Registrazione passkey annullata', 'error');
                }
            });
        }
    }
    loadTotp();
    loadPasskeys();
}
export default { render };
