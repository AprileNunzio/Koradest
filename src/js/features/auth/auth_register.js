import { Router, toast } from '../../utils.js';

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-stack" style="max-width: 760px; margin: var(--k-space-6) auto;">
                    <div class="k-card fade-in-up">
                        <div style="text-align: center; margin-bottom: var(--k-space-4);">
                            <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--md-primary);">admin_panel_settings</span>
                            <h1 class="text-title" style="font-size: 1.5rem; margin-top: var(--k-space-2);">Amministratore della Rete</h1>
                            <p class="k-hint" style="margin-top: var(--k-space-1);">La rete è stata configurata. Registra ora il primo amministratore del nodo.</p>
                        </div>
                        <form id="register-form" class="k-stack" style="--k-gap: var(--k-space-4);">
                            <div class="k-form-grid">
                                <div class="k-field">
                                    <label class="k-label" for="cognome">Cognome *</label>
                                    <input type="text" id="cognome" class="k-input" placeholder="Cognome" required autocomplete="off">
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="nome">Nome *</label>
                                    <input type="text" id="nome" class="k-input" placeholder="Nome" required autocomplete="off">
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="codice_fiscale">Codice Fiscale *</label>
                                    <input type="text" id="codice_fiscale" class="k-input" placeholder="Codice Fiscale" required autocomplete="off" style="text-transform: uppercase;">
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="email">Indirizzo Email *</label>
                                    <input type="email" id="email" class="k-input" placeholder="email@azienda.it" required autocomplete="off">
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="password">Password (di recupero) *</label>
                                    <input type="password" id="password" class="k-input" placeholder="Password di recupero" required>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="password-confirm">Conferma Password *</label>
                                    <input type="password" id="password-confirm" class="k-input" placeholder="Ripeti Password" required>
                                </div>
                            </div>

                            <div>
                                <div style="display: flex; gap: 4px; margin-bottom: var(--k-space-1);" id="password-strength-container">
                                    <div class="pwd-strength-bar" id="pwd-bar-1" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                    <div class="pwd-strength-bar" id="pwd-bar-2" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                    <div class="pwd-strength-bar" id="pwd-bar-3" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                    <div class="pwd-strength-bar" id="pwd-bar-4" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                </div>
                                <div style="text-align: right; font-size: 0.75rem; color: var(--md-on-surface-variant);" id="pwd-strength-text">Efficacia password</div>
                            </div>

                            <div class="k-form-grid">
                                <div class="k-field">
                                    <label class="k-label" style="display: flex; align-items: center; gap: var(--k-space-1); color: var(--md-primary);">
                                        <span class="material-symbols-rounded" style="font-size: 1.1rem;">dialpad</span> PIN di Accesso (6 cifre)
                                    </label>
                                    <div id="register-pin-container" class="k-row" style="--k-gap: var(--k-space-2); justify-content: space-between;">
                                        <input type="password" maxlength="1" class="k-input pin-box" data-index="0" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box" data-index="1" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box" data-index="2" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box" data-index="3" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box" data-index="4" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box" data-index="5" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                    </div>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" style="display: flex; align-items: center; gap: var(--k-space-1); color: var(--md-primary);">
                                        <span class="material-symbols-rounded" style="font-size: 1.1rem;">dialpad</span> Ripeti PIN
                                    </label>
                                    <div id="register-pin-confirm-container" class="k-row" style="--k-gap: var(--k-space-2); justify-content: space-between;">
                                        <input type="password" maxlength="1" class="k-input pin-box-confirm" data-index="0" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box-confirm" data-index="1" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box-confirm" data-index="2" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box-confirm" data-index="3" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box-confirm" data-index="4" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                        <input type="password" maxlength="1" class="k-input pin-box-confirm" data-index="5" required style="width: 2.75rem; height: 3.25rem; font-size: 1.5rem; text-align: center; padding: 0;">
                                    </div>
                                </div>
                            </div>

                            <button type="submit" class="k-btn k-btn--primary" style="width: 100%; justify-content: center; margin-top: var(--k-space-2);">
                                <span class="material-symbols-rounded">rocket_launch</span>
                                Avvia Rete
                            </button>
                        </form>
                    </div>
                </div>`;

            const form = el.querySelector('#register-form');
            const setupPinInputs = (inputsArray) => {
                inputsArray.forEach((input, idx) => {
                    input.addEventListener('input', (e) => {
                        try {
                            const val = e.target.value;
                            if (/[^0-9]/.test(val)) {
                                e.target.value = '';
                                return;
                            }
                            if (val !== '' && idx < inputsArray.length - 1) {
                                inputsArray[idx + 1].focus();
                            }
                        } catch(err) { console.error(err); }
                    });
                    input.addEventListener('keydown', (e) => {
                        try {
                            if (e.key === 'Backspace' && e.target.value === '' && idx > 0) {
                                inputsArray[idx - 1].focus();
                            }
                        } catch(err) { console.error(err); }
                    });
                });
            };

            const pinInputs = Array.from(el.querySelectorAll('#register-pin-container .pin-box'));
            const pinConfirmInputs = Array.from(el.querySelectorAll('#register-pin-confirm-container .pin-box-confirm'));
            setupPinInputs(pinInputs);
            setupPinInputs(pinConfirmInputs);

            const pwdInput = el.querySelector('#password');
            const bars = [
                el.querySelector('#pwd-bar-1'),
                el.querySelector('#pwd-bar-2'),
                el.querySelector('#pwd-bar-3'),
                el.querySelector('#pwd-bar-4')
            ];
            const pwdText = el.querySelector('#pwd-strength-text');
            pwdInput.addEventListener('input', (e) => {
                const val = e.target.value;
                let score = 0;
                if (val.length > 5) score++;
                if (val.length > 8) score++;
                if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
                if (/[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) score++;
                bars.forEach(b => b.style.background = 'var(--md-outline-variant)');
                if (val.length === 0) {
                    pwdText.textContent = 'Efficacia password';
                    pwdText.style.color = 'var(--md-on-surface-variant)';
                } else if (score <= 1) {
                    bars[0].style.background = '#e53935';
                    pwdText.textContent = 'Debole';
                    pwdText.style.color = '#e53935';
                } else if (score === 2) {
                    bars[0].style.background = '#fb8c00';
                    bars[1].style.background = '#fb8c00';
                    pwdText.textContent = 'Discreta';
                    pwdText.style.color = '#fb8c00';
                } else if (score === 3) {
                    bars[0].style.background = '#fdd835';
                    bars[1].style.background = '#fdd835';
                    bars[2].style.background = '#fdd835';
                    pwdText.textContent = 'Buona';
                    pwdText.style.color = '#fbc02d';
                } else {
                    bars.forEach(b => b.style.background = '#43a047');
                    pwdText.textContent = 'Forte';
                    pwdText.style.color = '#43a047';
                }
            });

            form.addEventListener('submit', async (e) => {
                try {
                    e.preventDefault();
                    const cognome = el.querySelector('#cognome').value.trim();
                    const nome = el.querySelector('#nome').value.trim();
                    const email = el.querySelector('#email').value.trim();
                    const codice_fiscale = el.querySelector('#codice_fiscale').value.trim().toUpperCase();
                    const password = el.querySelector('#password').value.trim();
                    const passwordConfirm = el.querySelector('#password-confirm').value.trim();
                    const pin = pinInputs.map(i => i.value).join('');
                    const pinConfirm = pinConfirmInputs.map(i => i.value).join('');
                    if (pin.length !== 6) {
                        toast('Il PIN deve essere di 6 cifre', 'error');
                        return;
                    }
                    if (!cognome || !nome || !email || !codice_fiscale || !password || !pin || !passwordConfirm || !pinConfirm) {
                        toast('Compila tutti i campi', 'error');
                        return;
                    }
                    if (password !== passwordConfirm) {
                        toast('Le password non coincidono', 'error');
                        return;
                    }
                    if (pin !== pinConfirm) {
                        toast('I PIN non coincidono', 'error');
                        return;
                    }
                    if (window.electronAPI) {
                        const result = await window.electronAPI.registerUser({ nome, cognome, email, codice_fiscale, password, pin });
                        if (result && result.success) {
                            sessionStorage.setItem('currentUserId', result.id);
                            toast('Amministratore creato con successo.', 'success');
                            el.innerHTML = `
                                <div class="k-stack" style="max-width: 540px; margin: var(--k-space-6) auto;">
                                    <div class="k-card fade-in-up" style="text-align: center;">
                                        <div style="width: 72px; height: 72px; background: var(--md-primary-container); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--k-space-4);">
                                            <span class="material-symbols-rounded" style="font-size: 2.75rem; color: var(--md-on-primary-container);">verified_user</span>
                                        </div>
                                        <h1 class="text-title" style="font-size: 1.5rem; color: var(--md-primary);">Rete Operativa</h1>
                                        <p class="k-hint" style="margin-top: var(--k-space-2); margin-bottom: var(--k-space-6); line-height: 1.5;">
                                            L'archivio locale è cifrato e questa postazione è un nodo attivo della rete. Il codice di sicurezza resta disponibile nelle opzioni della rete.
                                        </p>
                                        <button id="btn-go-dashboard" class="k-btn k-btn--primary" style="width: 100%; justify-content: center;">
                                            <span class="material-symbols-rounded">space_dashboard</span>
                                            Vai alla Dashboard
                                        </button>
                                    </div>
                                </div>`;
                            el.querySelector('#btn-go-dashboard').addEventListener('click', () => {
                                Router.navigate('dashboard');
                            });
                        } else {
                            toast('Errore durante la creazione', 'error');
                        }
                    }
                } catch (err) {
                    console.error(err);
                    toast('Errore di rete o database', 'error');
                }
            });
        } catch (e) {
            console.error(e);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore nel caricamento della registrazione.</div></div>';
        }
    }
};
