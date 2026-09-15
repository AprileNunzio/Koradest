import { toast } from '../../../../../js/utils.js';

export default {
    render: async (container, configCache, saveConfig) => {
        try {
            const isScuola = configCache.is_scuola === true || configCache.is_scuola === 'true';

            container.innerHTML = `
                <div class="k-card fade-in-up">
                    <div style="margin-bottom: var(--k-space-4);">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">Dati Fiscali / Tesoreria</h3>
                        <p class="k-hint" style="margin-top: var(--k-space-1);">Impostazioni bancarie, tesoreria e fondi pensione dell'ente.</p>
                    </div>

                    <div class="k-form-grid">
                        <div class="k-field k-field--full">
                            <label class="k-label" for="da-istituto_cc_banca">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">account_balance</span>
                                Banca / Istituto Tesoreria
                            </label>
                            <input type="text" id="da-istituto_cc_banca" class="k-input" value="${configCache.istituto_cc_banca || ''}" placeholder="Es. Banca d'Italia">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_cc_intestatario">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">badge</span>
                                Intestatario Conto
                            </label>
                            <input type="text" id="da-istituto_cc_intestatario" class="k-input" value="${configCache.istituto_cc_intestatario || ''}" placeholder="Es. Nome Ente">
                        </div>

                        <div class="k-field">
                            <label class="k-label" for="da-istituto_cc_iban">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">tag</span>
                                IBAN Conto Corrente
                            </label>
                            <input type="text" id="da-istituto_cc_iban" class="k-input" value="${configCache.istituto_cc_iban || ''}" placeholder="IT...">
                        </div>

                        <div class="k-field k-field--full" style="display: ${isScuola ? 'block' : 'none'};">
                            <label class="k-label" for="da-istituto_fondo_espero">
                                <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">savings</span>
                                Fondo Espero (Scuole)
                            </label>
                            <input type="text" id="da-istituto_fondo_espero" class="k-input" value="${configCache.istituto_fondo_espero || ''}" placeholder="Es. Aderente / Non aderente">
                        </div>
                    </div>

                    <div class="k-row" style="margin-top: var(--k-space-6); justify-content: flex-end;">
                        <button id="da-btn-save-fiscali" class="k-btn k-btn--primary">
                            <span class="material-symbols-rounded">save</span>
                            Salva Dati Fiscali
                        </button>
                    </div>
                </div>`;

            container.querySelector('#da-btn-save-fiscali').addEventListener('click', async (ev) => {
                const btn = ev.currentTarget;
                const old = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Salvataggio...';
                
                try {
                    const patch = {
                        istituto_cc_banca: container.querySelector('#da-istituto_cc_banca').value.trim(),
                        istituto_cc_intestatario: container.querySelector('#da-istituto_cc_intestatario').value.trim(),
                        istituto_cc_iban: container.querySelector('#da-istituto_cc_iban').value.trim(),
                        istituto_fondo_espero: container.querySelector('#da-istituto_fondo_espero') ? container.querySelector('#da-istituto_fondo_espero').value.trim() : ''
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
            container.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore caricamento dati fiscali</div></div>';
        }
    }
};
