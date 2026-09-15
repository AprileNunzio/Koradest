import { Router, toast } from '../utils.js';

const AuthForceChange = {
    render: async (el) => {
        try {
            const currentUserId = sessionStorage.getItem('currentUserId');
            if (!currentUserId) {
                Router.navigate('auth_login');
                return;
            }

            el.innerHTML = `
                <div class="k-stack" style="max-width: 480px; margin: var(--k-space-6) auto;">
                    <div class="k-card fade-in-up">
                        <div style="text-align: center; margin-bottom: var(--k-space-4);">
                            <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--md-primary);">admin_panel_settings</span>
                            <h1 class="text-title" style="font-size: 1.35rem; margin-top: var(--k-space-2);">Aggiornamento Credenziali Obbligatorio</h1>
                            <p class="k-hint" style="line-height: 1.5; margin-top: var(--k-space-1);">
                                Il tuo account richiede di impostare credenziali personali prima di accedere all'infrastruttura.
                            </p>
                        </div>
                        <form id="force-change-form" class="k-stack" style="--k-gap: var(--k-space-3);">
                            <div class="k-field">
                                <label class="k-label" for="new-pwd">Nuova Password di Sicurezza</label>
                                <input type="password" id="new-pwd" class="k-input" placeholder="Inserisci nuova password" required minlength="6" autofocus>
                            </div>
                            <div class="k-field">
                                <label class="k-label" for="confirm-pwd">Conferma Password</label>
                                <input type="password" id="confirm-pwd" class="k-input" placeholder="Ripeti la password" required>
                            </div>
                            <div style="border-top: 1px solid var(--md-outline); margin: var(--k-space-2) 0;"></div>
                            <div class="k-field">
                                <label class="k-label" for="new-pin">Nuovo PIN Operativo (6 Cifre)</label>
                                <input type="password" id="new-pin" class="k-input" placeholder="Es. 123456" maxlength="6" pattern="[0-9]{6}" required>
                            </div>
                            <div class="k-field">
                                <label class="k-label" for="confirm-pin">Conferma PIN</label>
                                <input type="password" id="confirm-pin" class="k-input" placeholder="Ripeti il PIN" maxlength="6" pattern="[0-9]{6}" required>
                            </div>
                            <button type="submit" class="k-btn k-btn--primary" style="width: 100%; justify-content: center; margin-top: var(--k-space-2);">
                                <span class="material-symbols-rounded">verified_user</span>
                                Autentica e Accedi
                            </button>
                        </form>
                    </div>
                </div>`;

            el.querySelector('#force-change-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const pwd = el.querySelector('#new-pwd').value;
                const pwd2 = el.querySelector('#confirm-pwd').value;
                const pin = el.querySelector('#new-pin').value;
                const pin2 = el.querySelector('#confirm-pin').value;
                if (pwd !== pwd2) {
                    toast('Le password non coincidono', 'error');
                    return;
                }
                if (pin !== pin2) {
                    toast('I PIN non coincidono', 'error');
                    return;
                }
                try {
                    const usersRes = await window.electronAPI.getUsersList();
                    const user = usersRes.users.find(u => u.id === currentUserId);
                    if (!user) throw new Error('Utente non trovato');
                    const result = await window.electronAPI.usersUpdate({
                        id: currentUserId,
                        username: user.username,
                        email: user.email || '',
                        password: pwd,
                        pin: pin,
                        must_change_password: 0
                    });
                    if (result.success) {
                        toast('Credenziali aggiornate con successo', 'success');
                        Router.navigate('dashboard');
                    } else {
                        toast(result.error || "Errore durante l'aggiornamento", 'error');
                    }
                } catch (err) {
                    console.error(err);
                    toast('Si è verificato un errore di sistema', 'error');
                }
            });
        } catch (e) {
            console.error(e);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore nel caricamento della pagina.</div></div>';
        }
    }
};

export default AuthForceChange;
