import { toast } from '../../../../../js/utils.js';

export default {
    render: async (container, configCache, saveConfig) => {
        try {
            const isScuola = configCache.is_scuola === true || configCache.is_scuola === 'true';

            container.innerHTML = `
                <div class="k-card fade-in-up">
                    <div class="k-row k-row--between" style="margin-bottom: var(--k-space-4); align-items: center;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">Dati Generali Ente</h3>
                            <p class="k-hint" style="margin-top: var(--k-space-1);">Informazioni legali, anagrafiche e fatturazione.</p>
                        </div>
                        <div class="k-row" style="--k-gap: var(--k-space-2); align-items: center;">
                            <span style="font-weight: 600; color: var(--md-on-surface-variant); font-size: 0.9rem;">L'ente è una Scuola?</span>
                            <label class="k-switch">
                                <input type="checkbox" id="da-is-scuola" ${isScuola ? 'checked' : ''} aria-label="Ente scolastico">
                                <span class="k-switch-track"></span>
                            </label>
                        </div>
                    </div>

                    <div class="k-form-grid">
                        <div class="k-field k-field--full">
                            <label class="k-label" for="da-istituto_nome">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">corporate_fare</span>
                                Denominazione Ente / Ragione Sociale *
                            </label>
                            <input type="text" id="da-istituto_nome" class="k-input" value="${configCache.istituto_nome || ''}" placeholder="Es. I.C. Giovanni Verga / Azienda S.p.A.">
                        </div>

                        <div id="scuola-fields-container" class="k-field k-field--full" style="display: ${isScuola ? 'block' : 'none'};">
                            <div class="k-card k-card--muted" style="border: 1px dashed var(--md-primary); padding: var(--k-space-3);">
                                <label class="k-label" for="da-istituto_codice_meccanografico">
                                    <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">school</span>
                                    Codice Meccanografico
                                </label>
                                <input type="text" id="da-istituto_codice_meccanografico" class="k-input" value="${configCache.istituto_codice_meccanografico || ''}" placeholder="Es. RMIC8AA00X">
                            </div>
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_piva">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">receipt_long</span>
                                Partita IVA
                            </label>
                            <input type="text" id="da-istituto_piva" class="k-input" value="${configCache.istituto_piva || ''}" placeholder="Es. 01234567890">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_cf">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">badge</span>
                                Codice Fiscale
                            </label>
                            <input type="text" id="da-istituto_cf" class="k-input" value="${configCache.istituto_cf || ''}" placeholder="Es. 80012345678">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_sdi">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">send</span>
                                Codice Destinatario (SDI)
                            </label>
                            <input type="text" id="da-istituto_sdi" class="k-input" value="${configCache.istituto_sdi || ''}" placeholder="Es. M5UXCR1 (o PEC)">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_forma">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">account_circle</span>
                                Forma Giuridica / REA
                            </label>
                            <input type="text" id="da-istituto_forma" class="k-input" value="${configCache.istituto_forma || ''}" placeholder="Es. S.p.A. / Ente Pubblico / REA MI-1234">
                        </div>

                        <div class="k-field k-field--full">
                            <label class="k-label" for="da-istituto_rappresentante">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">gavel</span>
                                Legale Rappresentante
                            </label>
                            <input type="text" id="da-istituto_rappresentante" class="k-input" value="${configCache.istituto_rappresentante || ''}" placeholder="Nome e Cognome del Dirigente o Amministratore">
                        </div>

                        <div class="k-field k-field--full">
                            <label class="k-label" for="da-istituto_indirizzo">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">location_on</span>
                                Indirizzo Sede Legale Completo
                            </label>
                            <input type="text" id="da-istituto_indirizzo" class="k-input" value="${configCache.istituto_indirizzo || ''}" placeholder="Via, civico, CAP, città (Prov.)">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_telefono">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">call</span>
                                Telefono Principale
                            </label>
                            <input type="text" id="da-istituto_telefono" class="k-input" value="${configCache.istituto_telefono || ''}" placeholder="Es. +39 06 1234567">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_web">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">public</span>
                                Sito Web
                            </label>
                            <input type="text" id="da-istituto_web" class="k-input" value="${configCache.istituto_web || ''}" placeholder="Es. www.azienda.it">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_email">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">mail</span>
                                Email Istituzionale
                            </label>
                            <input type="text" id="da-istituto_email" class="k-input" value="${configCache.istituto_email || ''}" placeholder="Es. info@azienda.it">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_pec">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">mark_email_read</span>
                                Email PEC
                            </label>
                            <input type="text" id="da-istituto_pec" class="k-input" value="${configCache.istituto_pec || ''}" placeholder="Es. pec@pec.azienda.it">
                        </div>

                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Social Media & Comunicazione</h4>
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_linkedin">LinkedIn</label>
                            <input type="text" id="da-istituto_linkedin" class="k-input" value="${configCache.istituto_linkedin || ''}" placeholder="URL pagina LinkedIn">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_facebook">Facebook</label>
                            <input type="text" id="da-istituto_facebook" class="k-input" value="${configCache.istituto_facebook || ''}" placeholder="URL pagina Facebook">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_instagram">Instagram</label>
                            <input type="text" id="da-istituto_instagram" class="k-input" value="${configCache.istituto_instagram || ''}" placeholder="Username o URL Instagram">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_twitter">X (Twitter)</label>
                            <input type="text" id="da-istituto_twitter" class="k-input" value="${configCache.istituto_twitter || ''}" placeholder="Username o URL Twitter">
                        </div>
                    </div>

                    <div class="k-row" style="margin-top: var(--k-space-6); justify-content: flex-end;">
                        <button id="da-btn-save-generali" class="k-btn k-btn--primary">
                            <span class="material-symbols-rounded">save</span>
                            Salva Dati Generali
                        </button>
                    </div>
                </div>`;

            const chkScuola = container.querySelector('#da-is-scuola');
            const scFields = container.querySelector('#scuola-fields-container');

            chkScuola.addEventListener('change', (e) => {
                try {
                    scFields.style.display = e.target.checked ? 'block' : 'none';
                } catch (err) {
                    console.error(err);
                }
            });

            container.querySelector('#da-btn-save-generali').addEventListener('click', async (ev) => {
                const btn = ev.currentTarget;
                const old = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Salvataggio...';
                
                try {
                    const patch = {
                        is_scuola: chkScuola.checked,
                        istituto_nome: container.querySelector('#da-istituto_nome').value.trim(),
                        istituto_codice_meccanografico: container.querySelector('#da-istituto_codice_meccanografico').value.trim(),
                        istituto_piva: container.querySelector('#da-istituto_piva').value.trim(),
                        istituto_cf: container.querySelector('#da-istituto_cf').value.trim(),
                        istituto_sdi: container.querySelector('#da-istituto_sdi').value.trim(),
                        istituto_forma: container.querySelector('#da-istituto_forma').value.trim(),
                        istituto_rappresentante: container.querySelector('#da-istituto_rappresentante').value.trim(),
                        istituto_indirizzo: container.querySelector('#da-istituto_indirizzo').value.trim(),
                        istituto_telefono: container.querySelector('#da-istituto_telefono').value.trim(),
                        istituto_web: container.querySelector('#da-istituto_web').value.trim(),
                        istituto_email: container.querySelector('#da-istituto_email').value.trim(),
                        istituto_pec: container.querySelector('#da-istituto_pec').value.trim(),
                        istituto_linkedin: container.querySelector('#da-istituto_linkedin').value.trim(),
                        istituto_facebook: container.querySelector('#da-istituto_facebook').value.trim(),
                        istituto_instagram: container.querySelector('#da-istituto_instagram').value.trim(),
                        istituto_twitter: container.querySelector('#da-istituto_twitter').value.trim()
                    };
                    const ok = await saveConfig(patch);
                    toast(ok ? 'Dati salvati con successo' : 'Errore nel salvataggio', ok ? 'success' : 'error');
                } catch (e) {
                    toast('Errore: ' + e.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = old;
                }
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore caricamento dati generali</div></div>';
        }
    }
};
