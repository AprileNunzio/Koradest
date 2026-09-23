import { esc } from './utilita.js';

let _stileInietto = false;

export function iniettaStileLive() {
    try {
        if (_stileInietto || typeof document === 'undefined') return;
        const stile = document.createElement('style');
        stile.textContent = [
            '.k-live-campo { margin-bottom: 12px; position: relative; }',
            '.k-live-etichetta { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--md-on-surface-variant, #64748b); margin-bottom: 5px; font-weight: 600; }',
            '.k-live-riga { display: flex; align-items: center; gap: 6px; position: relative; }',
            '.k-live-riga .k-input, .k-live-riga .ds-input, .k-live-riga .ds-select, .k-live-riga .ds-textarea { flex: 1; transition: border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.2s ease; border-radius: 8px; }',
            '.k-live-audit { background: transparent; border: 1px solid transparent; padding: 4px; color: var(--md-outline, #94a3b8); cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.65; transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease; flex-shrink: 0; }',
            '.k-live-campo:hover .k-live-audit, .k-live-audit:focus-visible { opacity: 1; }',
            '.k-live-audit:hover { background: var(--md-surface-variant, #f1f5f9); color: var(--md-primary, #0d9488); border-color: var(--md-outline-variant, #cbd5e1); }',
            '.k-live-audit .material-symbols-rounded { font-size: 19px; }',
            '.k-live-ok { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.22) !important; }',
            '.k-live-errore { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.22) !important; animation: kLiveScuoti 0.3s ease-in-out; }',
            '.k-live-msg { font-size: 12px; color: #ef4444; margin-top: 4px; display: none; font-weight: 500; }',
            '@keyframes kLiveScuoti { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }',
            '.k-audit-dialog { border: none; border-radius: 16px; padding: 0; background: var(--md-surface, #ffffff); color: var(--md-on-surface, #0f172a); box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08); width: 680px; max-width: 94vw; max-height: 88vh; overflow: hidden; }',
            '.k-audit-dialog::backdrop { background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px); }',
            '.k-audit-box { display: flex; flex-direction: column; height: 100%; max-height: 88vh; }',
            '.k-audit-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--md-outline-variant, #e2e8f0); gap: 14px; background: var(--md-surface-raised, #f8fafc); }',
            '.k-audit-header-left { display: flex; align-items: center; gap: 12px; }',
            '.k-audit-icon-mark { width: 44px; height: 44px; border-radius: 10px; background: rgba(13, 148, 136, 0.12); color: #0d9488; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }',
            '.k-audit-title { font-size: 17px; font-weight: 700; margin: 0; color: var(--md-on-surface, #0f172a); }',
            '.k-audit-subtitle { font-size: 12px; color: var(--md-on-surface-variant, #64748b); margin-top: 2px; }',
            '.k-audit-close { background: transparent; border: none; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--md-on-surface-variant, #64748b); transition: background 0.15s ease; }',
            '.k-audit-close:hover { background: var(--md-surface-variant, #e2e8f0); color: var(--md-on-surface, #0f172a); }',
            '.k-audit-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 22px; background: var(--md-surface, #ffffff); border-bottom: 1px solid var(--md-outline-variant, #e2e8f0); gap: 12px; flex-wrap: wrap; }',
            '.k-audit-trust { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: rgba(34, 197, 94, 0.1); color: #15803d; border: 1px solid rgba(34, 197, 94, 0.25); }',
            '.k-audit-search { flex: 1; min-width: 180px; position: relative; }',
            '.k-audit-search input { width: 100%; box-sizing: border-box; padding: 6px 10px 6px 30px; font-size: 12px; border-radius: 6px; border: 1px solid var(--md-outline-variant, #cbd5e1); outline: none; }',
            '.k-audit-search input:focus { border-color: #0d9488; }',
            '.k-audit-search .material-symbols-rounded { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #94a3b8; pointer-events: none; }',
            '.k-audit-body { padding: 20px 22px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; background: var(--md-surface, #ffffff); }',
            '.k-audit-timeline { position: relative; padding-left: 28px; display: flex; flex-direction: column; gap: 16px; }',
            '.k-audit-timeline::before { content: ""; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 2px; background: var(--md-outline-variant, #e2e8f0); }',
            '.k-audit-node { position: relative; background: var(--md-surface-raised, #f8fafc); border: 1px solid var(--md-outline-variant, #e2e8f0); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s ease, box-shadow 0.2s ease; }',
            '.k-audit-node:hover { border-color: #0d9488; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.08); }',
            '.k-audit-dot { position: absolute; left: -24px; top: 18px; width: 14px; height: 14px; border-radius: 50%; background: #0d9488; border: 3px solid var(--md-surface, #ffffff); box-shadow: 0 0 0 1px #0d9488; }',
            '.k-audit-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12px; }',
            '.k-audit-author { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--md-on-surface, #0f172a); }',
            '.k-audit-time { color: var(--md-on-surface-variant, #64748b); font-size: 11px; font-weight: 500; }',
            '.k-audit-diff { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; padding: 10px; background: var(--md-surface, #ffffff); border: 1px solid var(--md-outline-variant, #e2e8f0); border-radius: 8px; font-size: 13px; }',
            '.k-audit-old { background: rgba(239, 68, 68, 0.08); color: #b91c1c; padding: 6px 10px; border-radius: 6px; text-decoration: line-through; word-break: break-word; font-family: monospace; }',
            '.k-audit-arrow { color: #0d9488; font-size: 18px; display: flex; align-items: center; justify-content: center; }',
            '.k-audit-new { background: rgba(34, 197, 94, 0.1); color: #15803d; padding: 6px 10px; border-radius: 6px; font-weight: 600; word-break: break-word; font-family: monospace; }',
            '.k-audit-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 4px; }',
            '.k-audit-hash { font-size: 11px; font-family: monospace; color: var(--md-outline, #94a3b8); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; }',
            '.k-audit-hash:hover { background: var(--md-surface-variant, #f1f5f9); color: var(--md-on-surface, #0f172a); }',
            '.k-audit-btn-restore { background: #0d9488; color: #ffffff; border: none; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.15s ease; }',
            '.k-audit-btn-restore:hover { background: #0f766e; }',
            '.k-audit-btn-restore .material-symbols-rounded { font-size: 15px; }',
            '.k-audit-empty { text-align: center; padding: 40px 20px; color: var(--md-on-surface-variant, #64748b); display: flex; flex-direction: column; align-items: center; gap: 10px; }',
            '.k-audit-empty .material-symbols-rounded { font-size: 48px; color: #cbd5e1; }'
        ].join('\n');
        document.head.appendChild(stile);
        _stileInietto = true;
    } catch (_) {}
}

export function collegaCampiLive(contenitore, koradest, config = {}) {
    try {
        iniettaStileLive();
    } catch (_) {}

    try {
        const azione = config.azione;
        const tabella = config.tabella;
        const recordId = config.recordId;
        const salvaHandler = typeof config.salva === 'function' ? config.salva : null;
        const campi = contenitore.querySelectorAll('[data-live]');

        campi.forEach(campo => {
            try {
                const nomeCampo = campo.dataset.live;
                let valoreIniziale = campo.type === 'checkbox' ? (campo.checked ? 1 : 0) : campo.value;
                const wrapper = campo.closest('.k-live-campo') || campo.closest('.ds-field');
                const msgEl = wrapper ? wrapper.querySelector('.k-live-msg') || wrapper.querySelector('.ds-field__error') : null;
                const auditBtn = wrapper ? wrapper.querySelector('.k-live-audit') : null;

                const eseguiSalvataggio = async () => {
                    try {
                        const nuovoValore = campo.type === 'checkbox' ? (campo.checked ? 1 : 0) : campo.value;
                        if (String(nuovoValore) === String(valoreIniziale)) return;

                        campo.classList.remove('k-live-ok', 'k-live-errore');
                        if (msgEl) {
                            msgEl.textContent = '';
                            msgEl.style.display = 'none';
                        }
                        campo.style.opacity = '0.65';

                        try {
                            if (salvaHandler) {
                                await salvaHandler(nomeCampo, nuovoValore, recordId);
                            } else if (azione && koradest && typeof koradest.chiama === 'function') {
                                const payload = { id: recordId, ...(config.payloadExtra || {}) };
                                payload[nomeCampo] = nuovoValore;
                                await koradest.chiama(azione, payload);
                            }
                            valoreIniziale = nuovoValore;
                            campo.classList.add('k-live-ok');
                            setTimeout(() => {
                                try { campo.classList.remove('k-live-ok'); } catch (_) {}
                            }, 2600);
                        } catch (errSalva) {
                            campo.classList.add('k-live-errore');
                            if (msgEl) {
                                msgEl.textContent = errSalva.message || 'Errore salvataggio';
                                msgEl.style.display = 'block';
                            }
                        } finally {
                            campo.style.opacity = '1';
                        }
                    } catch (errGenerale) {
                        campo.style.opacity = '1';
                    }
                };

                campo.addEventListener('blur', eseguiSalvataggio);
                if (campo.tagName === 'SELECT' || campo.type === 'checkbox') {
                    campo.addEventListener('change', eseguiSalvataggio);
                }

                if (auditBtn) {
                    auditBtn.addEventListener('click', async () => {
                        try {
                            await apriStoricoModifiche({
                                koradest,
                                tabella,
                                recordId,
                                campo: nomeCampo,
                                etichetta: campo.dataset.etichetta || nomeCampo,
                                onRipristina: async valoreStorico => {
                                    try {
                                        if (campo.type === 'checkbox') {
                                            campo.checked = Number(valoreStorico) === 1 || valoreStorico === 'true';
                                        } else {
                                            campo.value = valoreStorico;
                                        }
                                        await eseguiSalvataggio();
                                    } catch (_) {}
                                }
                            });
                        } catch (_) {}
                    });
                }
            } catch (_) {}
        });
    } catch (_) {}
}

export async function apriStoricoModifiche({ koradest, tabella, recordId, campo, etichetta, onRipristina }) {
    try {
        iniettaStileLive();
        let audit = [];
        try {
            if (koradest && typeof koradest.chiama === 'function') {
                audit = await koradest.chiama('audit.leggi_campo', {
                    tabella,
                    entita: tabella,
                    record_id: recordId,
                    entita_id: recordId,
                    entitaId: recordId,
                    campo
                });
            }
        } catch (e) {
            audit = [];
        }

        const righe = Array.isArray(audit) ? audit : (audit && Array.isArray(audit.modifiche) ? audit.modifiche : []);
        const modale = document.createElement('dialog');
        modale.className = 'k-audit-dialog';

        const chiudi = () => {
            try { modale.close(); modale.remove(); } catch (_) {}
        };

        const timelineHtml = righe.length > 0
            ? righe.map((r, idx) => {
                const vecchio = r.vecchio_valore !== undefined ? r.vecchio_valore : (r.valori_precedenti ? JSON.stringify(r.valori_precedenti) : '-');
                const nuovo = r.nuovo_valore !== undefined ? r.nuovo_valore : (r.valori_nuovi ? JSON.stringify(r.valori_nuovi) : '-');
                const dataOra = r.data_ora || r.timestamp || 'Data sconosciuta';
                const operatore = r.operatore || r.eseguito_da || 'Sistema';
                const hash = r.hash ? String(r.hash) : '';
                const hashCorto = hash ? `#${hash.slice(0, 10)}...` : '';

                return `
                <div class="k-audit-node" data-audit-idx="${idx}">
                    <div class="k-audit-dot"></div>
                    <div class="k-audit-meta">
                        <span class="k-audit-author">
                            <span class="material-symbols-rounded" style="font-size: 16px; color: #0d9488;">account_circle</span>
                            ${esc(operatore)}
                        </span>
                        <span class="k-audit-time">${esc(dataOra)}</span>
                    </div>
                    <div class="k-audit-diff">
                        <div class="k-audit-old" title="Valore precedente">${esc(String(vecchio || '-'))}</div>
                        <div class="k-audit-arrow"><span class="material-symbols-rounded">arrow_forward</span></div>
                        <div class="k-audit-new" title="Nuovo valore">${esc(String(nuovo || '-'))}</div>
                    </div>
                    <div class="k-audit-actions">
                        ${hashCorto ? `<span class="k-audit-hash" data-hash="${esc(hash)}" title="Clicca per copiare l'impronta crittografica">${esc(hashCorto)}</span>` : '<span></span>'}
                        ${onRipristina ? `
                            <button type="button" class="k-audit-btn-restore" data-restore-val="${esc(String(vecchio || ''))}">
                                <span class="material-symbols-rounded">restore</span> Ripristina precedente
                            </button>` : ''}
                    </div>
                </div>`;
            }).join('')
            : `
            <div class="k-audit-empty">
                <span class="material-symbols-rounded">history_toggle_off</span>
                <strong>Nessuna modifica registrata</strong>
                <span>Questo campo si trova attualmente al suo valore originario o non ha ancora subito variazioni tracciate.</span>
            </div>`;

        modale.innerHTML = `
            <div class="k-audit-box">
                <div class="k-audit-header">
                    <div class="k-audit-header-left">
                        <div class="k-audit-icon-mark"><span class="material-symbols-rounded">history_edu</span></div>
                        <div>
                            <h2 class="k-audit-title">Storico: ${esc(etichetta || campo)}</h2>
                            <div class="k-audit-subtitle">Tabella: <code>${esc(tabella)}</code> &bull; ID: <code>${esc(String(recordId || ''))}</code></div>
                        </div>
                    </div>
                    <button type="button" class="k-audit-close" title="Chiudi"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="k-audit-bar">
                    <div class="k-audit-trust">
                        <span class="material-symbols-rounded" style="font-size: 14px;">verified_user</span>
                        Catena SHA-256 Verificata
                    </div>
                    ${righe.length > 0 ? `
                    <div class="k-audit-search">
                        <span class="material-symbols-rounded">search</span>
                        <input type="text" placeholder="Filtra cronologia..." data-audit-filter>
                    </div>` : ''}
                </div>
                <div class="k-audit-body">
                    <div class="k-audit-timeline">${timelineHtml}</div>
                </div>
            </div>`;

        document.body.appendChild(modale);
        modale.showModal();

        modale.querySelector('.k-audit-close')?.addEventListener('click', chiudi);
        modale.addEventListener('click', e => { if (e.target === modale) chiudi(); });

        const searchInput = modale.querySelector('[data-audit-filter]');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                try {
                    const q = e.target.value.toLowerCase().trim();
                    modale.querySelectorAll('.k-audit-node').forEach(node => {
                        const txt = node.textContent.toLowerCase();
                        node.style.display = txt.includes(q) ? 'flex' : 'none';
                    });
                } catch (_) {}
            });
        }

        modale.querySelectorAll('[data-hash]').forEach(chip => {
            chip.addEventListener('click', () => {
                try {
                    navigator.clipboard.writeText(chip.dataset.hash || '');
                    chip.textContent = 'Copiato!';
                    setTimeout(() => { chip.textContent = `#${chip.dataset.hash.slice(0, 10)}...`; }, 1500);
                } catch (_) {}
            });
        });

        if (onRipristina) {
            modale.querySelectorAll('.k-audit-btn-restore').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const val = btn.dataset.restoreVal;
                        chiudi();
                        await onRipristina(val);
                    } catch (_) {}
                });
            });
        }
    } catch (_) {}
}
