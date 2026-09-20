import { toast } from '../../../../../js/utils.js';
import { confermaInLinea } from '../../../../../js/shared/conferma_inline.js';

export default {
    render: async (container) => {
        try {
            const DAYS = [
                { id: 'lun', label: 'Lunedì' },
                { id: 'mar', label: 'Martedì' },
                { id: 'mer', label: 'Mercoledì' },
                { id: 'gio', label: 'Giovedì' },
                { id: 'ven', label: 'Venerdì' },
                { id: 'sab', label: 'Sabato' },
                { id: 'dom', label: 'Domenica' }
            ];

            container.innerHTML = `
                <div class="k-viste">
                <section class="k-vista" data-vista="elenco" data-attiva="si">
                <div class="k-row k-row--between" style="align-items: center; margin-bottom: var(--k-space-4);">
                    <div>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">Sedi Aziendali</h3>
                        <p class="k-hint" style="margin-top: var(--k-space-1);">Elenco delle sedi fisiche, orari e contatti.</p>
                    </div>
                    <button id="da-btn-add-sede" class="k-btn k-btn--primary">
                        <span class="material-symbols-rounded">add</span>
                        Aggiungi Sede
                    </button>
                </div>

                <div class="k-card k-card--flush">
                    <div style="overflow-x: auto;">
                        <table class="k-table">
                            <thead>
                                <tr>
                                    <th>Nome Sede</th>
                                    <th>Indirizzo</th>
                                    <th>Contatti</th>
                                    <th style="text-align: right;">Azioni</th>
                                </tr>
                            </thead>
                            <tbody id="da-sedi-tbody">
                                <tr><td colspan="4" style="text-align: center; padding: var(--k-space-6);"><div class="k-spinner"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                </section>

                <section id="da-sede-modal" class="k-vista" data-vista="modulo" data-attiva="no">
                    <div class="k-card">
                        <div class="k-card-header">
                            <div class="k-card-title"><span class="material-symbols-rounded">domain</span><span id="da-sede-modal-title">Gestione Sede</span></div>
                            <button id="da-sede-modal-close" class="k-btn k-btn--ghost k-btn--sm">
                                <span class="material-symbols-rounded">arrow_back</span>Torna all'elenco
                            </button>
                        </div>
                        <div>
                            <input type="hidden" id="da-sede-id">
                            
                            <div class="k-form-grid">
                                <div class="k-field k-field--full">
                                    <div class="k-row k-row--between" style="align-items: center;">
                                        <div style="flex: 1; margin-right: var(--k-space-4);">
                                            <label class="k-label" for="da-sede-nome">Nome Sede *</label>
                                            <input type="text" id="da-sede-nome" class="k-input" placeholder="Es. Sede Centrale">
                                        </div>
                                        <div class="k-row" style="--k-gap: var(--k-space-2); align-items: center; margin-top: var(--k-space-4);">
                                            <span style="font-weight: 600; font-size: 0.9rem; color: var(--md-on-surface);">Sede Principale</span>
                                            <label class="k-switch">
                                                <input type="checkbox" id="da-sede-is-centrale" aria-label="Sede Principale">
                                                <span class="k-switch-track"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="k-field k-field--full">
                                    <label class="k-label" for="da-sede-indirizzo">Indirizzo</label>
                                    <input type="text" id="da-sede-indirizzo" class="k-input" placeholder="Via, civico">
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="da-sede-citta">Città</label>
                                    <input type="text" id="da-sede-citta" class="k-input" placeholder="Città">
                                </div>
                                <div class="k-field">
                                    <div class="k-row" style="--k-gap: var(--k-space-2);">
                                        <div style="flex: 2;">
                                            <label class="k-label" for="da-sede-cap">CAP</label>
                                            <input type="text" id="da-sede-cap" class="k-input" placeholder="00000">
                                        </div>
                                        <div style="flex: 1;">
                                            <label class="k-label" for="da-sede-provincia">Prov.</label>
                                            <input type="text" id="da-sede-provincia" class="k-input" placeholder="RM">
                                        </div>
                                    </div>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="da-sede-telefono">Telefono</label>
                                    <input type="text" id="da-sede-telefono" class="k-input" placeholder="Es. +39 06 1234567">
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="da-sede-email">Email</label>
                                    <input type="email" id="da-sede-email" class="k-input" placeholder="sede@azienda.it">
                                </div>

                                <div class="k-field k-field--full" style="margin-top: var(--k-space-2);">
                                    <h4 style="margin: 0; color: var(--md-primary); font-size: 1rem; font-weight: 700;">Orari di Apertura</h4>
                                </div>
                                <div class="k-field k-field--full">
                                    <div id="da-sede-orari" class="k-stack" style="--k-gap: var(--k-space-2);">
                                        ${DAYS.map(day => `
                                            <div class="orario-row k-card k-card--muted" data-day="${day.id}" style="padding: var(--k-space-2) var(--k-space-3);">
                                                <div class="k-row" style="align-items: center; --k-gap: var(--k-space-3); flex-wrap: wrap;">
                                                    <div style="width: 120px;">
                                                        <label class="k-row" style="--k-gap: var(--k-space-2); align-items: center; cursor: pointer; margin: 0;">
                                                            <input type="checkbox" class="chk-aperto" checked>
                                                            <span style="font-weight: 600;">${day.label}</span>
                                                        </label>
                                                    </div>
                                                    <div class="orari-inputs k-row" style="flex: 1; --k-gap: var(--k-space-3); align-items: center; flex-wrap: wrap;">
                                                        <div class="k-row" style="align-items: center; --k-gap: var(--k-space-1);">
                                                            <span class="k-hint">Mattina:</span>
                                                            <input type="time" class="k-input m-start" value="08:00" style="padding: var(--k-space-1); width: auto;">
                                                            <span>-</span>
                                                            <input type="time" class="k-input m-end" value="13:00" style="padding: var(--k-space-1); width: auto;">
                                                        </div>
                                                        <div class="k-row" style="align-items: center; --k-gap: var(--k-space-1);">
                                                            <span class="k-hint">Pomeriggio:</span>
                                                            <input type="time" class="k-input p-start" style="padding: var(--k-space-1); width: auto;">
                                                            <span>-</span>
                                                            <input type="time" class="k-input p-end" style="padding: var(--k-space-1); width: auto;">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="k-card-footer">
                            <button id="da-sede-modal-cancel" class="k-btn k-btn--ghost">Annulla</button>
                            <button id="da-sede-modal-save" class="k-btn k-btn--primary">
                                <span class="material-symbols-rounded">check</span>
                                Salva Sede
                            </button>
                        </div>
                    </div>
                </section>
                </div>`;

            const tbody = container.querySelector('#da-sedi-tbody');
            const modal = container.querySelector('#da-sede-modal');
            const viste = new Map(Array.from(container.querySelectorAll('.k-vista')).map(v => [v.dataset.vista, v]));
            const mostraVista = (nome) => {
                for (const [chiave, vista] of viste) vista.dataset.attiva = chiave === nome ? 'si' : 'no';
            };

            const loadSedi = async () => {
                try {
                    const sedi = await window.electronAPI.datiAzienda.getSedi();
                    tbody.innerHTML = '';
                    if (!sedi || sedi.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: var(--k-space-6);" class="k-hint">Nessuna sede configurata.</td></tr>';
                        return;
                    }
                    sedi.forEach(sede => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>
                                <div style="font-weight: 600; color: var(--md-on-surface);">${sede.nome}</div>
                                ${sede.is_centrale ? '<span class="k-badge k-badge--primary">Centrale</span>' : ''}
                            </td>
                            <td class="k-hint">
                                ${sede.indirizzo || ''} ${sede.citta ? '- ' + sede.citta : ''}
                            </td>
                            <td class="k-hint">
                                ${sede.telefono ? 'Tel: ' + sede.telefono + '<br>' : ''}
                                ${sede.email ? 'Email: ' + sede.email : ''}
                            </td>
                            <td style="text-align: right;">
                                <button class="k-btn k-btn--ghost btn-edit" data-id="${sede.id}" title="Modifica">
                                    <span class="material-symbols-rounded">edit</span>
                                </button>
                                <button class="k-btn k-btn--ghost btn-delete" data-id="${sede.id}" title="Elimina" style="color: var(--md-error);">
                                    <span class="material-symbols-rounded">delete</span>
                                </button>
                            </td>`;
                        tbody.appendChild(tr);
                    });

                    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openModal(b.dataset.id)));
                    tbody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteSede(b.dataset.id, b)));

                } catch (e) {
                    tbody.innerHTML = `<tr><td colspan="4" style="color: var(--md-error); padding: var(--k-space-4);">Errore caricamento: ${e.message}</td></tr>`;
                }
            };

            const openModal = async (id = null) => {
                container.querySelector('#da-sede-id').value = '';
                container.querySelector('#da-sede-nome').value = '';
                container.querySelector('#da-sede-is-centrale').checked = false;
                container.querySelector('#da-sede-indirizzo').value = '';
                container.querySelector('#da-sede-citta').value = '';
                container.querySelector('#da-sede-cap').value = '';
                container.querySelector('#da-sede-provincia').value = '';
                container.querySelector('#da-sede-telefono').value = '';
                container.querySelector('#da-sede-email').value = '';
                
                container.querySelectorAll('.orario-row').forEach(row => {
                    row.querySelector('.chk-aperto').checked = true;
                    row.querySelector('.m-start').value = '08:00';
                    row.querySelector('.m-end').value = '13:00';
                    row.querySelector('.p-start').value = '';
                    row.querySelector('.p-end').value = '';
                    row.querySelector('.orari-inputs').style.opacity = '1';
                });

                if (id) {
                    try {
                        const s = await window.electronAPI.datiAzienda.getSedeById(id);
                        if (s) {
                            container.querySelector('#da-sede-id').value = s.id;
                            container.querySelector('#da-sede-nome').value = s.nome;
                            container.querySelector('#da-sede-is-centrale').checked = !!s.is_centrale;
                            container.querySelector('#da-sede-indirizzo').value = s.indirizzo || '';
                            container.querySelector('#da-sede-citta').value = s.citta || '';
                            container.querySelector('#da-sede-cap').value = s.cap || '';
                            container.querySelector('#da-sede-provincia').value = s.provincia || '';
                            container.querySelector('#da-sede-telefono').value = s.telefono || '';
                            container.querySelector('#da-sede-email').value = s.email || '';

                            if (s.orari && typeof s.orari === 'object') {
                                DAYS.forEach(day => {
                                    const row = container.querySelector(`.orario-row[data-day="${day.id}"]`);
                                    const shifts = s.orari[day.id];
                                    if (shifts && shifts.length > 0) {
                                        row.querySelector('.chk-aperto').checked = true;
                                        row.querySelector('.orari-inputs').style.opacity = '1';
                                        
                                        if (shifts[0]) {
                                            row.querySelector('.m-start').value = shifts[0].start || '';
                                            row.querySelector('.m-end').value = shifts[0].end || '';
                                        }
                                        if (shifts[1]) {
                                            row.querySelector('.p-start').value = shifts[1].start || '';
                                            row.querySelector('.p-end').value = shifts[1].end || '';
                                        }
                                    } else {
                                        row.querySelector('.chk-aperto').checked = false;
                                        row.querySelector('.orari-inputs').style.opacity = '0.4';
                                        row.querySelector('.m-start').value = '';
                                        row.querySelector('.m-end').value = '';
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        toast('Errore caricamento sede', 'error');
                        return;
                    }
                }
                
                mostraVista('modulo');
            };

            const chiudiModal = () => {
                mostraVista('elenco');
            };

            container.querySelector('#da-btn-add-sede').addEventListener('click', () => openModal());
            container.querySelector('#da-sede-modal-close').addEventListener('click', chiudiModal);
            container.querySelector('#da-sede-modal-cancel').addEventListener('click', chiudiModal);

            container.querySelectorAll('.chk-aperto').forEach(chk => {
                chk.addEventListener('change', (e) => {
                    try {
                        const row = e.target.closest('.orario-row');
                        const inputs = row.querySelector('.orari-inputs');
                        if (e.target.checked) {
                            inputs.style.opacity = '1';
                        } else {
                            inputs.style.opacity = '0.4';
                            row.querySelector('.m-start').value = '';
                            row.querySelector('.m-end').value = '';
                            row.querySelector('.p-start').value = '';
                            row.querySelector('.p-end').value = '';
                        }
                    } catch (err) {
                        console.error(err);
                    }
                });
            });

            container.querySelector('#da-sede-modal-save').addEventListener('click', async (ev) => {
                const nome = container.querySelector('#da-sede-nome').value.trim();
                if (!nome) {
                    toast('Inserire il Nome Sede', 'error');
                    return;
                }

                const orariObj = {};
                DAYS.forEach(day => {
                    const row = container.querySelector(`.orario-row[data-day="${day.id}"]`);
                    const isAperto = row.querySelector('.chk-aperto').checked;
                    orariObj[day.id] = [];
                    if (isAperto) {
                        const mS = row.querySelector('.m-start').value;
                        const mE = row.querySelector('.m-end').value;
                        if (mS && mE) orariObj[day.id].push({ start: mS, end: mE });

                        const pS = row.querySelector('.p-start').value;
                        const pE = row.querySelector('.p-end').value;
                        if (pS && pE) orariObj[day.id].push({ start: pS, end: pE });
                    }
                });

                const data = {
                    id: container.querySelector('#da-sede-id').value,
                    nome: nome,
                    is_centrale: container.querySelector('#da-sede-is-centrale').checked,
                    indirizzo: container.querySelector('#da-sede-indirizzo').value.trim(),
                    citta: container.querySelector('#da-sede-citta').value.trim(),
                    cap: container.querySelector('#da-sede-cap').value.trim(),
                    provincia: container.querySelector('#da-sede-provincia').value.trim(),
                    telefono: container.querySelector('#da-sede-telefono').value.trim(),
                    email: container.querySelector('#da-sede-email').value.trim(),
                    orari: orariObj
                };

                const btn = ev.currentTarget;
                const old = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Salvataggio...';

                try {
                    await window.electronAPI.datiAzienda.saveSede(data);
                    toast('Sede salvata', 'success');
                    chiudiModal();
                    loadSedi();
                } catch (e) {
                    toast('Errore salvataggio: ' + e.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = old;
                }
            });

            const deleteSede = async (id, bottone) => {
                if (await confermaInLinea(bottone, { testo: 'Eliminare questa sede? Verrà rimossa dai dati aziendali di tutti i nodi.', etichetta: 'Elimina' })) {
                    try {
                        await window.electronAPI.datiAzienda.deleteSede(id);
                        toast('Sede eliminata', 'success');
                        loadSedi();
                    } catch (e) {
                        toast('Errore eliminazione: ' + e.message, 'error');
                    }
                }
            };

            await loadSedi();

        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore caricamento sedi</div></div>';
        }
    }
};
