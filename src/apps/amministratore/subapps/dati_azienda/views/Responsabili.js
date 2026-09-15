import { toast } from '../../../../../js/utils.js';

export default {
    render: async (container, configCache, saveConfig) => {
        try {
            const isScuola = configCache.is_scuola === true || configCache.is_scuola === 'true';
            
            let customResp = [];
            if (configCache.responsabili_custom) {
                try {
                    customResp = JSON.parse(configCache.responsabili_custom);
                } catch(e) {
                    customResp = [];
                }
            }

            container.innerHTML = `
                <div class="k-card fade-in-up">
                    <div style="margin-bottom: var(--k-space-4);">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">Organigramma e Responsabili</h3>
                        <p class="k-hint" style="margin-top: var(--k-space-1);">Nomine dei responsabili per la sicurezza, privacy e altre figure legali richieste.</p>
                    </div>

                    <div class="k-form-grid">
                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Privacy & GDPR</h4>
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_titolare_privacy">Titolare del Trattamento Dati</label>
                            <input type="text" id="da-resp_titolare_privacy" class="k-input" value="${configCache.resp_titolare_privacy || ''}" placeholder="Es. Nome o Ragione Sociale">
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_dpo">Data Protection Officer (DPO / RPD)</label>
                            <input type="text" id="da-resp_dpo" class="k-input" value="${configCache.resp_dpo || ''}" placeholder="Nome, Cognome o Azienda">
                        </div>

                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Sicurezza sul Lavoro (D.Lgs. 81/08)</h4>
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_rspp">Responsabile Servizio Prevenzione (RSPP)</label>
                            <input type="text" id="da-resp_rspp" class="k-input" value="${configCache.resp_rspp || ''}" placeholder="Nominativo RSPP">
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_rls">Rappresentante dei Lavoratori (RLS)</label>
                            <input type="text" id="da-resp_rls" class="k-input" value="${configCache.resp_rls || ''}" placeholder="Nominativo RLS">
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_medico">Medico Competente</label>
                            <input type="text" id="da-resp_medico" class="k-input" value="${configCache.resp_medico || ''}" placeholder="Dott. Nome Cognome">
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_emergenze">Responsabile Antincendio / Emergenze</label>
                            <input type="text" id="da-resp_emergenze" class="k-input" value="${configCache.resp_emergenze || ''}" placeholder="Nominativo o Ditta Esterna">
                        </div>

                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Altre Figure Nominate</h4>
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_fumo">Preposto al Divieto di Fumo</label>
                            <input type="text" id="da-resp_fumo" class="k-input" value="${configCache.resp_fumo || ''}" placeholder="Nominativo">
                        </div>
                        <div class="k-field">
                            <label class="k-label" for="da-resp_sysadmin">Amministratore di Sistema</label>
                            <input type="text" id="da-resp_sysadmin" class="k-input" value="${configCache.resp_sysadmin || ''}" placeholder="Responsabile IT">
                        </div>
                        
                        <div class="k-field" style="display: ${isScuola ? 'block' : 'none'};">
                            <label class="k-label" for="da-resp_rtd">Responsabile Transizione Digitale (RTD)</label>
                            <input type="text" id="da-resp_rtd" class="k-input" value="${configCache.resp_rtd || ''}" placeholder="Nominativo RTD">
                        </div>

                        <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                            <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-2);">
                                <div>
                                    <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Organigramma Flessibile</h4>
                                    <p class="k-hint" style="margin-top: var(--k-space-1);">Inserisci liberamente DSGA, Dirigenti, Preposti o qualsiasi altra qualifica.</p>
                                </div>
                                <button id="da-btn-add-custom-resp" class="k-btn k-btn--ghost">
                                    <span class="material-symbols-rounded">add</span>
                                    Aggiungi Figura
                                </button>
                            </div>
                            
                            <div id="da-custom-resp-container" class="k-stack" style="--k-gap: var(--k-space-2);"></div>
                        </div>
                    </div>

                    <div class="k-row" style="margin-top: var(--k-space-6); justify-content: flex-end;">
                        <button id="da-btn-save-responsabili" class="k-btn k-btn--primary">
                            <span class="material-symbols-rounded">save</span>
                            Salva Organigramma
                        </button>
                    </div>
                </div>`;

            const customContainer = container.querySelector('#da-custom-resp-container');

            const renderCustomResp = () => {
                customContainer.innerHTML = '';
                if (customResp.length === 0) {
                    customContainer.innerHTML = '<div class="k-hint" style="text-align: center; padding: var(--k-space-3);">Nessuna figura personalizzata aggiunta.</div>';
                    return;
                }
                customResp.forEach((item, index) => {
                    const row = document.createElement('div');
                    row.className = 'k-row';
                    row.style.cssText = 'align-items: center; --k-gap: var(--k-space-2);';
                    row.innerHTML = `
                        <input type="text" class="k-input custom-role" value="${item.ruolo || ''}" placeholder="Ruolo (es. Dirigente, DSGA...)" style="flex: 1;">
                        <input type="text" class="k-input custom-name" value="${item.nome || ''}" placeholder="Nominativo" style="flex: 1;">
                        <button class="k-btn k-btn--ghost btn-remove-custom" data-index="${index}" style="color: var(--md-error);" title="Rimuovi">
                            <span class="material-symbols-rounded">delete</span>
                        </button>`;
                    customContainer.appendChild(row);
                });

                customContainer.querySelectorAll('.btn-remove-custom').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.currentTarget.dataset.index);
                        customResp.splice(idx, 1);
                        renderCustomResp();
                    });
                });
            };

            renderCustomResp();

            container.querySelector('#da-btn-add-custom-resp').addEventListener('click', () => {
                customResp.push({ ruolo: '', nome: '' });
                renderCustomResp();
            });

            container.querySelector('#da-btn-save-responsabili').addEventListener('click', async (ev) => {
                const btn = ev.currentTarget;
                const old = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Salvataggio...';
                
                try {
                    const customRows = customContainer.querySelectorAll('.k-row');
                    const currentCustomResp = [];
                    customRows.forEach(row => {
                        const ruolo = row.querySelector('.custom-role')?.value.trim();
                        const nome = row.querySelector('.custom-name')?.value.trim();
                        if (ruolo || nome) {
                            currentCustomResp.push({ ruolo, nome });
                        }
                    });

                    const patch = {
                        resp_titolare_privacy: container.querySelector('#da-resp_titolare_privacy').value.trim(),
                        resp_dpo: container.querySelector('#da-resp_dpo').value.trim(),
                        resp_rspp: container.querySelector('#da-resp_rspp').value.trim(),
                        resp_rls: container.querySelector('#da-resp_rls').value.trim(),
                        resp_medico: container.querySelector('#da-resp_medico').value.trim(),
                        resp_emergenze: container.querySelector('#da-resp_emergenze').value.trim(),
                        resp_fumo: container.querySelector('#da-resp_fumo').value.trim(),
                        resp_sysadmin: container.querySelector('#da-resp_sysadmin').value.trim(),
                        resp_rtd: container.querySelector('#da-resp_rtd') ? container.querySelector('#da-resp_rtd').value.trim() : '',
                        responsabili_custom: JSON.stringify(currentCustomResp)
                    };
                    const ok = await saveConfig(patch);
                    toast(ok ? 'Responsabili salvati con successo' : 'Errore nel salvataggio', ok ? 'success' : 'error');
                } catch (e) {
                    toast('Errore: ' + e.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = old;
                }
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore caricamento responsabili</div></div>`;
        }
    }
};
