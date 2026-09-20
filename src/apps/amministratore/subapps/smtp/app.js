import { toast } from '../../../../js/utils.js';

const campo = (id, etichetta, attributi = '', aiuto = '') => `
    <div class="k-field">
        <label class="k-label" for="${id}">${etichetta}</label>
        <input id="${id}" class="k-input" ${attributi}>
        ${aiuto ? `<span class="k-hint">${aiuto}</span>` : ''}
    </div>`;

const chiediEmailDiTest = (ancora) => new Promise((resolve) => {
    if (!ancora || !ancora.parentElement) {
        resolve(null);
        return;
    }
    const esistente = ancora.parentElement.querySelector('.k-richiesta-linea');
    if (esistente) esistente.remove();
    const riquadro = document.createElement('div');
    riquadro.className = 'k-richiesta-linea';
    riquadro.setAttribute('role', 'group');
    riquadro.setAttribute('aria-label', 'Test SMTP');
    riquadro.innerHTML = `
        <div class="k-field" style="flex: 1 1 16rem;">
            <label class="k-label" for="smtp-test-email-input">Indirizzo destinatario</label>
            <input type="email" id="smtp-test-email-input" class="k-input" placeholder="nome@esempio.it" autocomplete="email">
            <span class="k-hint">Invia un messaggio di prova con la configurazione attuale.</span>
        </div>
        <button type="button" id="smtp-test-email-ok" class="k-btn k-btn--primary"><span class="material-symbols-rounded">send</span>Invia</button>
        <button type="button" id="smtp-test-email-cancel" class="k-btn k-btn--ghost">Annulla</button>
    `;
    const chiudi = (valore) => {
        document.removeEventListener('keydown', allaTastiera, true);
        riquadro.remove();
        ancora.hidden = false;
        resolve(valore);
    };
    const allaTastiera = (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        chiudi(null);
    };
    ancora.hidden = true;
    ancora.after(riquadro);
    const input = riquadro.querySelector('#smtp-test-email-input');
    riquadro.querySelector('#smtp-test-email-ok').addEventListener('click', () => chiudi(input.value.trim()));
    riquadro.querySelector('#smtp-test-email-cancel').addEventListener('click', () => chiudi(null));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            chiudi(input.value.trim());
        }
    });
    document.addEventListener('keydown', allaTastiera, true);
    input.focus();
});

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-page fade-in-up">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            <span class="k-page-icon material-symbols-rounded">mail</span>
                            <div>
                                <h1 class="k-page-title">Server SMTP</h1>
                                <p class="k-page-subtitle">Server di posta in uscita usato dal kernel per le comunicazioni di sistema e dalle applicazioni.</p>
                            </div>
                        </div>
                        <div class="k-page-actions">
                            <button id="btn-test-smtp" class="k-btn">
                                <span class="material-symbols-rounded">science</span>Test connessione
                            </button>
                            <button id="btn-save-smtp" class="k-btn k-btn--primary">
                                <span class="material-symbols-rounded">save</span>Salva configurazione
                            </button>
                        </div>
                    </header>

                    <div class="k-grid k-grid--lg">
                        <section class="k-card">
                            <div class="k-card-header">
                                <h2 class="k-card-title"><span class="material-symbols-rounded">router</span>Parametri di rete</h2>
                            </div>
                            <div class="k-form-grid">
                                <div class="k-field k-field--full">
                                    <label class="k-label" for="smtp-host">Host SMTP</label>
                                    <input type="text" id="smtp-host" class="k-input" placeholder="es. smtp.office365.com">
                                </div>
                                ${campo('smtp-port', 'Porta', 'type="number" placeholder="587"')}
                                <div class="k-field">
                                    <label class="k-label" for="smtp-security">Sicurezza</label>
                                    <select id="smtp-security" class="k-select">
                                        <option value="none">Nessuna (non sicura)</option>
                                        <option value="starttls" selected>STARTTLS (consigliata)</option>
                                        <option value="ssl">SSL/TLS implicito</option>
                                    </select>
                                </div>
                                <div class="k-field k-field--full">
                                    <label class="k-label" for="smtp-timeout">Timeout di connessione (ms)</label>
                                    <input type="number" id="smtp-timeout" class="k-input" placeholder="10000">
                                </div>
                            </div>
                        </section>

                        <section class="k-card">
                            <div class="k-card-header">
                                <h2 class="k-card-title"><span class="material-symbols-rounded">passkey</span>Autenticazione</h2>
                            </div>
                            <div class="k-stack">
                                ${campo('smtp-user', 'Nome utente', 'type="text" placeholder="admin@azienda.it" autocomplete="off"')}
                                <div class="k-field">
                                    <label class="k-label" for="smtp-pass">Password o App Password</label>
                                    <div class="k-input-group">
                                        <span class="material-symbols-rounded">key</span>
                                        <input type="password" id="smtp-pass" class="k-input" placeholder="••••••••••••" autocomplete="new-password" style="padding-right: 2.75rem;">
                                        <button id="btn-toggle-pass" type="button" class="k-btn k-btn--ghost k-btn--icon k-btn--sm k-input-action" aria-label="Mostra o nascondi la password">
                                            <span class="material-symbols-rounded" id="icon-toggle-pass">visibility</span>
                                        </button>
                                    </div>
                                    <span class="k-hint">Con Google o Microsoft usa una App Password, non la password dell'account.</span>
                                </div>
                                <label class="k-check">
                                    <input type="checkbox" id="smtp-allow-self-signed">
                                    Ignora errori del certificato (TLS autofirmato)
                                </label>
                            </div>
                        </section>

                        <section class="k-card">
                            <div class="k-card-header">
                                <h2 class="k-card-title"><span class="material-symbols-rounded">contact_mail</span>Identità mittente</h2>
                            </div>
                            <div class="k-stack">
                                ${campo('smtp-sender-email', 'Email mittente', 'type="text" placeholder="noreply@azienda.it"')}
                                ${campo('smtp-sender-name', 'Nome visualizzato', 'type="text" placeholder="KORADEST"')}
                            </div>
                        </section>
                    </div>

                    <section id="smtp-console-container" class="k-section" style="display: none;">
                        <div class="k-section-header">
                            <h2 class="k-section-title k-row" style="--k-gap: var(--k-space-2);"><span class="material-symbols-rounded" style="color: var(--md-primary);">terminal</span>Traccia della connessione</h2>
                        </div>
                        <div id="smtp-console" class="k-console" role="log" aria-live="polite"></div>
                    </section>
                </div>
            `;
            const config = await window.electronAPI.readConfig() || {};
            const hostIn = el.querySelector('#smtp-host');
            const portIn = el.querySelector('#smtp-port');
            const secIn = el.querySelector('#smtp-security');
            const timeoutIn = el.querySelector('#smtp-timeout');
            const userIn = el.querySelector('#smtp-user');
            const passIn = el.querySelector('#smtp-pass');
            const selfSignIn = el.querySelector('#smtp-allow-self-signed');
            const sEmailIn = el.querySelector('#smtp-sender-email');
            const sNameIn = el.querySelector('#smtp-sender-name');
            if (config.smtp_host) hostIn.value = config.smtp_host;
            if (config.smtp_port) portIn.value = config.smtp_port;
            if (config.smtp_security) secIn.value = config.smtp_security;
            if (config.smtp_timeout) timeoutIn.value = config.smtp_timeout;
            if (config.smtp_user) userIn.value = config.smtp_user;
            if (config.smtp_pass) passIn.value = config.smtp_pass;
            if (config.smtp_allow_self_signed) selfSignIn.checked = true;
            if (config.smtp_sender_email) sEmailIn.value = config.smtp_sender_email;
            if (config.smtp_sender_name) sNameIn.value = config.smtp_sender_name;

            el.querySelector('#btn-toggle-pass').addEventListener('click', () => {
                const icon = el.querySelector('#icon-toggle-pass');
                const mostra = passIn.type === 'password';
                passIn.type = mostra ? 'text' : 'password';
                icon.textContent = mostra ? 'visibility_off' : 'visibility';
            });

            const getFormData = () => ({
                smtp_host: hostIn.value.trim(),
                smtp_port: parseInt(portIn.value) || null,
                smtp_security: secIn.value,
                smtp_timeout: parseInt(timeoutIn.value) || null,
                smtp_user: userIn.value.trim(),
                smtp_pass: passIn.value,
                smtp_allow_self_signed: selfSignIn.checked,
                smtp_sender_email: sEmailIn.value.trim(),
                smtp_sender_name: sNameIn.value.trim()
            });

            el.querySelector('#btn-save-smtp').addEventListener('click', async () => {
                const btn = el.querySelector('#btn-save-smtp');
                btn.setAttribute('aria-busy', 'true');
                const success = await window.electronAPI.saveConfig({ ...config, ...getFormData() });
                btn.removeAttribute('aria-busy');
                toast(success ? 'Configurazione SMTP salvata' : 'Salvataggio della configurazione non riuscito', success ? 'success' : 'error');
            });

            const consoleCtn = el.querySelector('#smtp-console-container');
            const consoleOut = el.querySelector('#smtp-console');
            const scrivi = (testo, tono) => {
                const riga = document.createElement('div');
                if (tono) riga.className = `k-console-${tono}`;
                riga.textContent = testo;
                consoleOut.appendChild(riga);
                consoleOut.scrollTop = consoleOut.scrollHeight;
            };

            el.querySelector('#btn-test-smtp').addEventListener('click', async (evento) => {
                const formData = getFormData();
                if (!formData.smtp_host || !formData.smtp_port) {
                    toast('Host e porta sono obbligatori per il test.', 'warning');
                    return;
                }
                const testEmail = await chiediEmailDiTest(evento.currentTarget);
                if (!testEmail) return;
                const btn = el.querySelector('#btn-test-smtp');
                btn.setAttribute('aria-busy', 'true');
                consoleCtn.style.display = 'flex';
                consoleOut.textContent = '';
                scrivi(`[Sistema] Connessione verso ${formData.smtp_host}:${formData.smtp_port}...`, 'sys');
                try {
                    const res = await window.electronAPI.testSmtpConnection(formData, testEmail);
                    if (res.logs) scrivi(String(res.logs));
                    if (res.success) {
                        toast('Test SMTP completato', 'success');
                        scrivi(`[Esito] Connessione riuscita, email inviata a ${testEmail}`, 'ok');
                    } else {
                        toast('Connessione SMTP non riuscita', 'error');
                        scrivi(`[Esito] ${res.error || 'Errore sconosciuto'}`, 'err');
                    }
                } catch (e) {
                    toast('Errore durante il test: ' + e.message, 'error');
                    scrivi(`[Esito] ${e.message}`, 'err');
                }
                btn.removeAttribute('aria-busy');
            });
        } catch (e) {
            console.error(e);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore di caricamento del modulo SMTP.</div></div>';
        }
    }
};
