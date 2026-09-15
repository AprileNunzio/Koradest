import { toast } from '../../../../js/utils.js';

export default {
    render: async (el) => {
        try {
            const currentUserId = sessionStorage.getItem('currentUserId');
            if (!currentUserId) {
                el.innerHTML = '<div class="k-alert k-alert--danger" style="margin: var(--k-space-6) auto; max-width: 480px;"><span class="material-symbols-rounded">error</span><div>Utente non autenticato.</div></div>';
                return;
            }

            const renderAuthForm = () => {
                try {
                    el.innerHTML = `
                        <div class="k-stack" style="max-width: 460px; margin: var(--k-space-6) auto; align-items: center; text-align: center;">
                            <span class="material-symbols-rounded" style="font-size: 3.5rem; color: var(--md-primary);">lock</span>
                            <h2 style="font-size: 1.5rem; color: var(--md-on-surface); font-weight: 700;">Verifica di Sicurezza</h2>
                            <p class="k-hint" style="font-size: 0.95rem; line-height: 1.5;">Il codice di sicurezza cifra tutti i dati della rete. Reinserisci il tuo PIN o la tua password per visualizzarlo.</p>
                            <div class="k-card" style="width: 100%; text-align: left;">
                                <div class="k-stack">
                                    <div class="k-field">
                                        <label class="k-label" for="auth-password">PIN o password</label>
                                        <input type="password" id="auth-password" class="k-input" autocomplete="current-password" placeholder="Il tuo PIN o la tua password...">
                                        <span id="auth-error" class="k-hint" style="display: none; color: var(--md-error); font-weight: 600;"></span>
                                    </div>
                                    <button id="btn-verify" class="k-btn k-btn--primary" style="width: 100%; justify-content: center;">
                                        <span class="material-symbols-rounded">key</span>
                                        Mostra il codice
                                    </button>
                                </div>
                            </div>
                        </div>`;

                    const btn = el.querySelector('#btn-verify');
                    const input = el.querySelector('#auth-password');
                    const errore = el.querySelector('#auth-error');
                    const mostraErrore = (messaggio) => {
                        errore.textContent = messaggio;
                        errore.style.display = messaggio ? 'block' : 'none';
                    };

                    const handleVerify = async () => {
                        try {
                            const credential = input.value;
                            if (!credential) {
                                mostraErrore('Inserisci il PIN o la password.');
                                return;
                            }
                            mostraErrore('');
                            btn.disabled = true;
                            btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Verifica...';
                            const res = await window.electronAPI.getNetworkCode({ credential });
                            if (res && res.success && res.code) {
                                renderCredentials(res.code);
                                return;
                            }
                            mostraErrore((res && res.error) || 'Codice non disponibile.');
                        } catch (e) {
                            console.error('[Credenziali]', e);
                            mostraErrore('Richiesta del codice non riuscita.');
                        } finally {
                            btn.disabled = false;
                            btn.innerHTML = '<span class="material-symbols-rounded">key</span> Mostra il codice';
                            input.value = '';
                            input.focus();
                        }
                    };

                    btn.addEventListener('click', handleVerify);
                    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleVerify(); });
                    setTimeout(() => input.focus(), 50);
                } catch (e) {
                    console.error('[Credenziali]', e);
                }
            };

            const renderCredentials = (networkCode) => {
                try {
                    el.innerHTML = `
                        <div class="k-stack" style="max-width: 600px; margin: var(--k-space-6) auto;">
                            <div style="text-align: center;">
                                <h2 style="font-size: 1.75rem; font-weight: 700; color: var(--md-on-surface);">Credenziali di Rete</h2>
                                <p class="k-hint" style="margin-top: var(--k-space-2);">Gestisci l'accesso alla Blockchain e autorizza la sincronizzazione dei nuovi nodi.</p>
                            </div>
                            <div class="k-card">
                                <div class="k-stack">
                                    <div class="k-row" style="--k-gap: var(--k-space-3); align-items: center;">
                                        <span class="k-page-icon material-symbols-rounded" style="color: var(--md-primary);">security</span>
                                        <div>
                                            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--md-on-surface);">Codice di Sicurezza</h3>
                                            <span class="k-badge k-badge--danger" style="font-size: 0.75rem; text-transform: uppercase;">Altamente Confidenziale</span>
                                        </div>
                                    </div>
                                    <p class="k-hint" style="line-height: 1.5;">Questo codice rappresenta l'identità crittografica della tua rete. Condividilo esclusivamente con i nodi autorizzati che necessitano di agganciarsi all'infrastruttura.</p>
                                    <div class="k-card k-card--flush" style="padding: var(--k-space-4); text-align: center; border: 2px dashed var(--md-primary); background: var(--md-surface-variant);">
                                        <div id="network-code-display" style="font-family: monospace; font-size: 2rem; font-weight: 800; letter-spacing: 3px; color: var(--md-primary); user-select: all; word-break: break-all;"></div>
                                    </div>
                                    <div class="k-row" style="justify-content: center; margin-top: var(--k-space-2);">
                                        <button id="btn-copy-code" class="k-btn k-btn--primary">
                                            <span class="material-symbols-rounded">content_copy</span>
                                            Copia negli appunti
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>`;

                    el.querySelector('#network-code-display').textContent = networkCode;
                    el.querySelector('#btn-copy-code').addEventListener('click', async () => {
                        try {
                            await navigator.clipboard.writeText(networkCode);
                            toast('Codice di Sicurezza copiato negli appunti', 'success');
                        } catch (err) {
                            console.error('[Credenziali]', err);
                            toast('Impossibile copiare negli appunti', 'error');
                        }
                    });
                } catch (e) {
                    console.error('[Credenziali]', e);
                }
            };

            renderAuthForm();
        } catch (e) {
            console.error('[Credenziali]', e);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore nel caricamento delle credenziali.</div></div>';
        }
    }
};
