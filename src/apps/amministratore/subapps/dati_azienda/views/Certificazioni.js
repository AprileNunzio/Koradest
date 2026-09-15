import { toast } from '../../../../../js/utils.js';

export default {
    render: async (container, configCache, saveConfig) => {
        try {
            container.innerHTML = `
                <div class="k-card fade-in-up">
                    <div style="margin-bottom: var(--k-space-4);">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">Certificazioni e Compliance</h3>
                        <p class="k-hint" style="margin-top: var(--k-space-1);">Gestisci i requisiti di qualificazione per appalti, bandi e conformità aziendale.</p>
                    </div>

                    <div class="k-form-grid">
                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Sistemi di Gestione (Norme ISO)</h4>
                        </div>
                        
                        <div class="k-field">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <label class="k-label" for="da-cert-iso9001-chk" style="margin: 0;">ISO 9001 (Qualità)</label>
                                <label class="k-switch">
                                    <input type="checkbox" id="da-cert-iso9001-chk" ${configCache.cert_iso9001 === 'true' ? 'checked' : ''} aria-label="ISO 9001">
                                    <span class="k-switch-track"></span>
                                </label>
                            </div>
                            <input type="text" id="da-cert-iso9001-ente" class="k-input da-cert-detail" value="${configCache.cert_iso9001_ente || ''}" placeholder="Ente certificatore / N. Certificato" style="display: ${configCache.cert_iso9001 === 'true' ? 'block' : 'none'};">
                        </div>

                        <div class="k-field">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <label class="k-label" for="da-cert-iso27001-chk" style="margin: 0;">ISO 27001 (Sicurezza IT)</label>
                                <label class="k-switch">
                                    <input type="checkbox" id="da-cert-iso27001-chk" ${configCache.cert_iso27001 === 'true' ? 'checked' : ''} aria-label="ISO 27001">
                                    <span class="k-switch-track"></span>
                                </label>
                            </div>
                            <input type="text" id="da-cert-iso27001-ente" class="k-input da-cert-detail" value="${configCache.cert_iso27001_ente || ''}" placeholder="Ente certificatore / N. Certificato" style="display: ${configCache.cert_iso27001 === 'true' ? 'block' : 'none'};">
                        </div>
                        
                        <div class="k-field">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <label class="k-label" for="da-cert-iso14001-chk" style="margin: 0;">ISO 14001 (Ambiente)</label>
                                <label class="k-switch">
                                    <input type="checkbox" id="da-cert-iso14001-chk" ${configCache.cert_iso14001 === 'true' ? 'checked' : ''} aria-label="ISO 14001">
                                    <span class="k-switch-track"></span>
                                </label>
                            </div>
                            <input type="text" id="da-cert-iso14001-ente" class="k-input da-cert-detail" value="${configCache.cert_iso14001_ente || ''}" placeholder="Ente certificatore / N. Certificato" style="display: ${configCache.cert_iso14001 === 'true' ? 'block' : 'none'};">
                        </div>

                        <div class="k-field">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <label class="k-label" for="da-cert-iso45001-chk" style="margin: 0;">ISO 45001 (Salute sul Lavoro)</label>
                                <label class="k-switch">
                                    <input type="checkbox" id="da-cert-iso45001-chk" ${configCache.cert_iso45001 === 'true' ? 'checked' : ''} aria-label="ISO 45001">
                                    <span class="k-switch-track"></span>
                                </label>
                            </div>
                            <input type="text" id="da-cert-iso45001-ente" class="k-input da-cert-detail" value="${configCache.cert_iso45001_ente || ''}" placeholder="Ente certificatore / N. Certificato" style="display: ${configCache.cert_iso45001 === 'true' ? 'block' : 'none'};">
                        </div>

                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Modelli Organizzativi e SOA</h4>
                        </div>

                        <div class="k-field">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <label class="k-label" for="da-cert-231-chk" style="margin: 0;">Modello Organizzativo 231/01</label>
                                <label class="k-switch">
                                    <input type="checkbox" id="da-cert-231-chk" ${configCache.cert_231 === 'true' ? 'checked' : ''} aria-label="Modello 231">
                                    <span class="k-switch-track"></span>
                                </label>
                            </div>
                            <input type="text" id="da-cert-231-ente" class="k-input da-cert-detail" value="${configCache.cert_231_ente || ''}" placeholder="Data adozione OdV" style="display: ${configCache.cert_231 === 'true' ? 'block' : 'none'};">
                        </div>

                        <div class="k-field">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <label class="k-label" for="da-cert-soa-chk" style="margin: 0;">Attestazione SOA (Opere Pubbliche)</label>
                                <label class="k-switch">
                                    <input type="checkbox" id="da-cert-soa-chk" ${configCache.cert_soa === 'true' ? 'checked' : ''} aria-label="Attestazione SOA">
                                    <span class="k-switch-track"></span>
                                </label>
                            </div>
                            <input type="text" id="da-cert-soa-ente" class="k-input da-cert-detail" value="${configCache.cert_soa_ente || ''}" placeholder="Categorie SOA (Es. OG1, OS3...)" style="display: ${configCache.cert_soa === 'true' ? 'block' : 'none'};">
                        </div>
                    </div>

                    <div class="k-row" style="margin-top: var(--k-space-6); justify-content: flex-end;">
                        <button id="da-btn-save-cert" class="k-btn k-btn--primary">
                            <span class="material-symbols-rounded">save</span>
                            Salva Certificazioni
                        </button>
                    </div>
                </div>`;

            const setupToggle = (chkId, txtId) => {
                const chk = container.querySelector('#' + chkId);
                const txt = container.querySelector('#' + txtId);
                if (!chk || !txt) return;
                chk.addEventListener('change', (e) => {
                    try {
                        txt.style.display = e.target.checked ? 'block' : 'none';
                        if (!e.target.checked) txt.value = '';
                    } catch (err) {
                        console.error(err);
                    }
                });
            };

            setupToggle('da-cert-iso9001-chk', 'da-cert-iso9001-ente');
            setupToggle('da-cert-iso27001-chk', 'da-cert-iso27001-ente');
            setupToggle('da-cert-iso14001-chk', 'da-cert-iso14001-ente');
            setupToggle('da-cert-iso45001-chk', 'da-cert-iso45001-ente');
            setupToggle('da-cert-231-chk', 'da-cert-231-ente');
            setupToggle('da-cert-soa-chk', 'da-cert-soa-ente');

            container.querySelector('#da-btn-save-cert').addEventListener('click', async (ev) => {
                const btn = ev.currentTarget;
                const old = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Salvataggio...';
                
                try {
                    const patch = {
                        cert_iso9001: container.querySelector('#da-cert-iso9001-chk').checked ? 'true' : 'false',
                        cert_iso9001_ente: container.querySelector('#da-cert-iso9001-ente').value.trim(),
                        cert_iso27001: container.querySelector('#da-cert-iso27001-chk').checked ? 'true' : 'false',
                        cert_iso27001_ente: container.querySelector('#da-cert-iso27001-ente').value.trim(),
                        cert_iso14001: container.querySelector('#da-cert-iso14001-chk').checked ? 'true' : 'false',
                        cert_iso14001_ente: container.querySelector('#da-cert-iso14001-ente').value.trim(),
                        cert_iso45001: container.querySelector('#da-cert-iso45001-chk').checked ? 'true' : 'false',
                        cert_iso45001_ente: container.querySelector('#da-cert-iso45001-ente').value.trim(),
                        cert_231: container.querySelector('#da-cert-231-chk').checked ? 'true' : 'false',
                        cert_231_ente: container.querySelector('#da-cert-231-ente').value.trim(),
                        cert_soa: container.querySelector('#da-cert-soa-chk').checked ? 'true' : 'false',
                        cert_soa_ente: container.querySelector('#da-cert-soa-ente').value.trim()
                    };
                    const ok = await saveConfig(patch);
                    toast(ok ? 'Certificazioni salvate con successo' : 'Errore nel salvataggio', ok ? 'success' : 'error');
                } catch (e) {
                    toast('Errore: ' + e.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = old;
                }
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore caricamento certificazioni</div></div>';
        }
    }
};
