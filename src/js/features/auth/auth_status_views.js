import { conferma } from '../../utils.js';

const AuthStatusViews = {
    renderUnlockForm: (el) => {
        try {
            el.innerHTML = `
                <div class="auth-wrapper fade-in-up" style="max-width: 28rem;">
                    <div class="card-status status-warning" style="margin: 0; width: 100%;">
                        <span class="material-symbols-rounded icon-large">lock_clock</span>
                        <h1 class="text-title">Database bloccato</h1>
                        <p class="text-subtitle">
                            Su questo PC c'è un database sincronizzato, ma mancano le chiavi di sicurezza locali. Inserisci il <b>codice di rete</b> per autorizzare il dispositivo.
                        </p>
                        <div class="k-field" style="text-align: left; width: 100%; margin-top: var(--k-space-3);">
                            <label class="k-label" for="input-network-code">Codice di rete</label>
                            <div class="k-input-group">
                                <span class="material-symbols-rounded">hub</span>
                                <input type="text" id="input-network-code" class="k-input" placeholder="Es. ABC-DEF-GHI" autocomplete="off" style="font-family: var(--font-mono); letter-spacing: 0.08em;">
                            </div>
                            <div id="unlock-error" class="k-field-error" style="display: none;">Codice errato o database non valido.</div>
                        </div>
                        <button id="btn-unlock-db" class="k-btn k-btn--primary k-btn--block k-btn--lg" style="margin-top: var(--k-space-2);">
                            <span class="material-symbols-rounded">key</span>Sblocca database
                        </button>
                        <div class="k-stack" style="--k-gap: var(--k-space-2); width: 100%; border-top: 1px solid var(--md-outline); padding-top: var(--k-space-4); margin-top: var(--k-space-2);">
                            <p class="k-hint">Se il database è davvero danneggiato:</p>
                            <button id="btn-reset-node" class="k-btn k-btn--danger-ghost k-btn--block">
                                <span class="material-symbols-rounded">delete_forever</span>Azzera nodo locale
                            </button>
                        </div>
                    </div>
                </div>
            `;
            const btnUnlock = el.querySelector('#btn-unlock-db');
            const inputCode = el.querySelector('#input-network-code');
            const errorText = el.querySelector('#unlock-error');
            if (btnUnlock && inputCode) {
                const sblocca = async () => {
                    const code = inputCode.value.trim();
                    if (!code) return;
                    try {
                        btnUnlock.setAttribute('aria-busy', 'true');
                        errorText.style.display = 'none';
                        const success = await window.electronAPI.recoverDatabase(code);
                        if (success) {
                            window.location.reload();
                            return;
                        }
                        errorText.style.display = 'block';
                    } catch (e) {
                        errorText.style.display = 'block';
                    }
                    btnUnlock.removeAttribute('aria-busy');
                };
                btnUnlock.addEventListener('click', sblocca);
                inputCode.addEventListener('keydown', (e) => { if (e.key === 'Enter') sblocca(); });
            }
            const btnReset = el.querySelector('#btn-reset-node');
            if (btnReset) {
                btnReset.addEventListener('click', async () => {
                    try {
                        const ok = await conferma({
                            titolo: 'Azzerare il nodo locale?',
                            testo: 'Il database locale sincronizzato verrà eliminato.\nSe la cartella è sincronizzata con OneDrive o simili, la cancellazione potrebbe propagarsi ad altri PC.',
                            etichetta: 'Azzera nodo',
                            pericolosa: true
                        });
                        if (ok) await window.electronAPI.resetApp();
                    } catch (e) {
                        console.error('[Accesso] Azzeramento non riuscito:', e);
                    }
                });
            }
        } catch (e) {
            console.error('[Accesso] Vista di sblocco non disponibile:', e);
        }
    },
    renderEmptyState: (el) => {
        try {
            el.innerHTML = `
                <div class="auth-wrapper fade-in-up" style="max-width: 28rem;">
                    <div class="card-status status-warning" style="margin: 0; width: 100%;">
                        <span class="material-symbols-rounded icon-large">person_off</span>
                        <h1 class="text-title">Nessun utente trovato</h1>
                        <p class="text-subtitle">Il database di questa rete è vuoto. Ripristina l'ambiente per creare un nuovo account amministratore.</p>
                        <button id="btn-reset-empty" class="k-btn k-btn--primary k-btn--lg" style="margin-top: var(--k-space-3);">
                            <span class="material-symbols-rounded">restart_alt</span>Ripristina dispositivo
                        </button>
                    </div>
                </div>
            `;
            const btn = el.querySelector('#btn-reset-empty');
            if (btn) {
                btn.addEventListener('click', async () => {
                    try {
                        const ok = await conferma({
                            titolo: 'Ripristinare il dispositivo?',
                            testo: 'Il database locale verrà eliminato e potrai configurare di nuovo la postazione.',
                            etichetta: 'Ripristina',
                            pericolosa: true
                        });
                        if (ok) await window.electronAPI.resetApp();
                    } catch (e) {
                        console.error('[Accesso] Ripristino non riuscito:', e);
                    }
                });
            }
        } catch (e) {
            console.error('[Accesso] Vista vuota non disponibile:', e);
        }
    }
};
export default AuthStatusViews;
