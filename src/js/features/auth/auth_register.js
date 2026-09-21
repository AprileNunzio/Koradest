import { Router, toast } from '../../utils.js';

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div style="width: 100%; max-width: 780px; margin: clamp(1rem, 3vh, 2.5rem) auto; padding: 0 clamp(0.75rem, 2vw, 1.5rem); box-sizing: border-box;">
                    <div class="k-card fade-in-up" style="border-radius: 20px; box-shadow: var(--k-shadow-lg); padding: clamp(1.5rem, 3vw, 2.5rem);">
                        <div style="text-align: center; margin-bottom: 2rem;">
                            <div style="width: 60px; height: 60px; border-radius: 16px; background: linear-gradient(135deg, var(--md-primary), var(--md-secondary)); color: #fff; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 8px 20px -6px rgba(var(--md-primary-rgb), 0.5);">
                                <span class="material-symbols-rounded" style="font-size: 2rem;">admin_panel_settings</span>
                            </div>
                            <h1 class="text-title" style="font-size: 1.55rem; font-weight: 700; margin: 0 0 0.4rem; color: var(--md-on-surface);">Amministratore della Rete</h1>
                            <p class="k-hint" style="margin: 0; font-size: 0.95rem; color: var(--md-on-surface-variant); line-height: 1.45;">La rete blockchain è configurata. Registra ora il primo super-amministratore per questo nodo.</p>
                        </div>
                        <form id="register-form" style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
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
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.25rem;">
                                <div class="k-field">
                                    <label class="k-label" for="password">Password (di recupero) *</label>
                                    <input type="password" id="password" class="k-input" placeholder="Password di recupero" required>
                                    <div style="margin-top: 6px;">
                                        <div style="display: flex; gap: 4px; margin-bottom: 4px;" id="password-strength-container">
                                            <div class="pwd-strength-bar" id="pwd-bar-1" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                            <div class="pwd-strength-bar" id="pwd-bar-2" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                            <div class="pwd-strength-bar" id="pwd-bar-3" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                            <div class="pwd-strength-bar" id="pwd-bar-4" style="flex: 1; height: 4px; border-radius: 2px; background: var(--md-outline-variant); transition: background 0.3s;"></div>
                                        </div>
                                        <div style="text-align: right; font-size: 0.75rem; color: var(--md-on-surface-variant);" id="pwd-strength-text">Efficacia password</div>
                                    </div>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="password-confirm">Conferma Password *</label>
                                    <input type="password" id="password-confirm" class="k-input" placeholder="Ripeti Password" required>
                                </div>
                            </div>

                            <div style="padding-top: 1.25rem; border-top: 1px solid var(--md-outline-variant); margin-top: 0.5rem;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.25rem;">
                                    <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.25rem;">dialpad</span>
                                    <span style="font-weight: 600; font-size: 0.95rem; color: var(--md-on-surface);">PIN di Accesso Rapido (6 cifre)</span>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; justify-items: center;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%;">
                                        <label class="k-label" style="font-size: 0.85rem; font-weight: 600;">PIN di Accesso *</label>
                                        <div id="register-pin-container" style="display: flex; gap: 6px; justify-content: center; flex-wrap: nowrap; width: 100%;">
                                            <input type="password" maxlength="1" class="pin-box" data-index="0" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box" data-index="1" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box" data-index="2" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box" data-index="3" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box" data-index="4" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box" data-index="5" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                        </div>
                                    </div>
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%;">
                                        <label class="k-label" style="font-size: 0.85rem; font-weight: 600;">Ripeti PIN *</label>
                                        <div id="register-pin-confirm-container" style="display: flex; gap: 6px; justify-content: center; flex-wrap: nowrap; width: 100%;">
                                            <input type="password" maxlength="1" class="pin-box pin-box-confirm" data-index="0" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box pin-box-confirm" data-index="1" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box pin-box-confirm" data-index="2" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box pin-box-confirm" data-index="3" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box pin-box-confirm" data-index="4" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                            <input type="password" maxlength="1" class="pin-box pin-box-confirm" data-index="5" required style="width: clamp(2.1rem, 4.5vw, 2.7rem); height: clamp(2.6rem, 5vw, 3.2rem); font-size: 1.4rem; text-align: center; border: 1.5px solid var(--md-outline-variant); border-radius: var(--k-radius-control); background: var(--md-surface); color: var(--md-on-surface); font-weight: 700; outline: none; padding: 0; transition: border-color 0.2s, box-shadow 0.2s;">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" class="k-btn k-btn--primary k-btn--lg" style="width: 100%; justify-content: center; height: 3.25rem; font-size: 1.05rem; font-weight: 600; border-radius: 12px; gap: 0.5rem; margin-top: 0.5rem;">
                                <span class="material-symbols-rounded" style="font-size: 1.35rem;">rocket_launch</span>
                                <span>Avvia e Registra Amministratore</span>
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
                        } catch (err) {
                            console.error(err);
                        }
                    });
                    input.addEventListener('keydown', (e) => {
                        try {
                            if (e.key === 'Backspace' && e.target.value === '' && idx > 0) {
                                inputsArray[idx - 1].focus();
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    });
                    input.addEventListener('paste', (e) => {
                        try {
                            e.preventDefault();
                            const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                            const digits = pasteData.replace(/\D/g, '').slice(0, 6);
                            if (digits.length > 0) {
                                digits.split('').forEach((d, i) => {
                                    if (inputsArray[i]) inputsArray[i].value = d;
                                });
                                const targetIdx = Math.min(digits.length, inputsArray.length - 1);
                                inputsArray[targetIdx].focus();
                            }
                        } catch (err) {
                            console.error(err);
                        }
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
                try {
                    const val = e.target.value;
                    let score = 0;
                    if (val.length > 5) score++;
                    if (val.length > 8) score++;
                    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
                    if (/[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) score++;
                    bars.forEach(b => { if (b) b.style.background = 'var(--md-outline-variant)'; });
                    if (val.length === 0) {
                        pwdText.textContent = 'Efficacia password';
                        pwdText.style.color = 'var(--md-on-surface-variant)';
                    } else if (score <= 1) {
                        if (bars[0]) bars[0].style.background = '#e53935';
                        pwdText.textContent = 'Debole';
                        pwdText.style.color = '#e53935';
                    } else if (score === 2) {
                        if (bars[0]) bars[0].style.background = '#fb8c00';
                        if (bars[1]) bars[1].style.background = '#fb8c00';
                        pwdText.textContent = 'Discreta';
                        pwdText.style.color = '#fb8c00';
                    } else if (score === 3) {
                        if (bars[0]) bars[0].style.background = '#fdd835';
                        if (bars[1]) bars[1].style.background = '#fdd835';
                        if (bars[2]) bars[2].style.background = '#fdd835';
                        pwdText.textContent = 'Buona';
                        pwdText.style.color = '#fbc02d';
                    } else {
                        bars.forEach(b => { if (b) b.style.background = '#43a047'; });
                        pwdText.textContent = 'Forte';
                        pwdText.style.color = '#43a047';
                    }
                } catch (err) {
                    console.error(err);
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
                        toast('Compila tutti i campi obbligatori', 'error');
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
                                <div style="width: 100%; max-width: 560px; margin: clamp(2rem, 5vh, 4rem) auto; padding: 0 1rem; box-sizing: border-box;">
                                    <div class="k-card fade-in-up" style="text-align: center; border-radius: 20px; box-shadow: var(--k-shadow-lg); padding: clamp(2rem, 4vw, 3rem);">
                                        <div style="width: 76px; height: 76px; background: var(--md-primary-container); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--k-space-4);">
                                            <span class="material-symbols-rounded" style="font-size: 2.8rem; color: var(--md-on-primary-container);">verified_user</span>
                                        </div>
                                        <h1 class="text-title" style="font-size: 1.6rem; color: var(--md-primary); margin: 0 0 0.5rem 0;">Rete Operativa</h1>
                                        <p class="k-hint" style="margin: 0 0 var(--k-space-6); line-height: 1.55; font-size: 0.95rem;">
                                            L'archivio locale è cifrato e questa postazione è un nodo attivo della rete. Il codice di sicurezza resta disponibile nelle opzioni della rete.
                                        </p>
                                        <button id="btn-go-dashboard" class="k-btn k-btn--primary k-btn--lg" style="width: 100%; justify-content: center; height: 3.25rem; font-size: 1.05rem; font-weight: 600; border-radius: 12px;">
                                            <span class="material-symbols-rounded">space_dashboard</span>
                                            <span>Vai alla Dashboard</span>
                                        </button>
                                    </div>
                                </div>`;
                            el.querySelector('#btn-go-dashboard').addEventListener('click', () => {
                                try {
                                    Router.navigate('dashboard');
                                } catch (err) {
                                    console.error(err);
                                }
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
