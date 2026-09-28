const esc = (val) => String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default {
    render: async (el) => {
        try {
            let tuttiComuni = [];
            if (window.electronAPI && window.electronAPI.comuni && typeof window.electronAPI.comuni.getAll === 'function') {
                tuttiComuni = await window.electronAPI.comuni.getAll();
            } else if (window.electronAPI && window.electronAPI.anagrafica && window.electronAPI.anagrafica.riferimenti) {
                tuttiComuni = await window.electronAPI.anagrafica.riferimenti.getAllComuni();
            }

            if (tuttiComuni && !Array.isArray(tuttiComuni) && Array.isArray(tuttiComuni.data)) {
                tuttiComuni = tuttiComuni.data;
            }
            if (!Array.isArray(tuttiComuni)) {
                if (tuttiComuni && tuttiComuni.error) {
                    console.warn('[Comuni] Errore API:', tuttiComuni.error);
                }
                tuttiComuni = [];
            }

            let paginaCorrente = 1;
            const perPagina = 20;
            let filtroTesto = '';
            let filtroRegione = '';
            let filtroProvincia = '';

            const regioniSet = new Set();
            const provinceSet = new Set();
            tuttiComuni.forEach(c => {
                const reg = (c.regione && (c.regione.nome || c.regione)) || '';
                if (reg) regioniSet.add(reg);
                const prov = c.sigla || '';
                if (prov) provinceSet.add(prov);
            });

            const regioni = Array.from(regioniSet).sort();
            const province = Array.from(provinceSet).sort();

            el.innerHTML = `
                <div class="k-page fade-in-up" style="display: flex; flex-direction: column; gap: 1.25rem; height: 100%; overflow-y: auto; padding: 1.5rem;">
                    <header class="k-page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                        <div class="k-page-heading" style="display: flex; align-items: center; gap: 1rem;">
                            <div style="display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: var(--md-primary-container, #e0f2fe); color: var(--md-primary, #0284c7);">
                                <span class="material-symbols-rounded" style="font-size: 28px;">location_city</span>
                            </div>
                            <div>
                                <h1 class="k-page-title" style="margin: 0; font-size: 1.75rem; font-weight: 800; color: var(--md-on-surface);">Database Comuni</h1>
                                <p class="k-page-subtitle" style="margin: 0.25rem 0 0; font-size: 0.95rem; color: var(--md-on-surface-variant);">Archivio nazionale dei Comuni d'Italia, sigle provinciali, CAP e codici catastali</p>
                            </div>
                        </div>
                        <button type="button" class="k-btn k-btn--primary" id="btn-crea-comune" style="display: inline-flex; align-items: center; gap: 6px; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <span class="material-symbols-rounded" style="font-size: 18px;">add</span> Nuovo Comune
                        </button>
                    </header>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="k-card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--md-outline-variant, #e2e8f0); background: var(--md-surface);">
                            <div style="font-size: 0.8rem; font-weight: 600; color: var(--md-on-surface-variant); text-transform: uppercase;">Totale Comuni</div>
                            <div style="font-size: 1.75rem; font-weight: 800; color: var(--md-primary, #0284c7); margin-top: 0.25rem;" id="stat-totale">${tuttiComuni.length.toLocaleString('it-IT')}</div>
                        </div>
                        <div class="k-card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--md-outline-variant, #e2e8f0); background: var(--md-surface);">
                            <div style="font-size: 0.8rem; font-weight: 600; color: var(--md-on-surface-variant); text-transform: uppercase;">Province Censite</div>
                            <div style="font-size: 1.75rem; font-weight: 800; color: var(--md-on-surface); margin-top: 0.25rem;">${province.length}</div>
                        </div>
                        <div class="k-card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--md-outline-variant, #e2e8f0); background: var(--md-surface);">
                            <div style="font-size: 0.8rem; font-weight: 600; color: var(--md-on-surface-variant); text-transform: uppercase;">Regioni</div>
                            <div style="font-size: 1.75rem; font-weight: 800; color: var(--md-on-surface); margin-top: 0.25rem;">${regioni.length}</div>
                        </div>
                    </div>

                    <div class="k-card" style="padding: 1rem; border-radius: 10px; border: 1px solid var(--md-outline-variant, #e2e8f0); background: var(--md-surface); display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                            <div style="flex: 1 1 240px; position: relative;">
                                <input type="search" id="input-cerca" class="k-input" placeholder="Cerca per nome, sigla provincia o CAP..." style="width: 100%; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid var(--md-outline-variant, #cbd5e1);">
                            </div>
                            <select id="select-regione" class="k-select" style="min-width: 160px; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--md-outline-variant, #cbd5e1);">
                                <option value="">Tutte le regioni</option>
                                ${regioni.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
                            </select>
                            <select id="select-provincia" class="k-select" style="min-width: 120px; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--md-outline-variant, #cbd5e1);">
                                <option value="">Tutte le prov.</option>
                                ${province.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
                            </select>
                        </div>

                        <div style="overflow-x: auto; border: 1px solid var(--md-outline-variant, #f1f5f9); border-radius: 8px;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <thead>
                                    <tr style="background: var(--md-surface-container-high, #f8fafc); border-bottom: 2px solid var(--md-outline-variant, #e2e8f0); color: var(--md-on-surface-variant);">
                                        <th style="padding: 0.75rem 1rem; font-weight: 700;">Comune</th>
                                        <th style="padding: 0.75rem; font-weight: 700; width: 70px; text-align: center;">Prov.</th>
                                        <th style="padding: 0.75rem; font-weight: 700;">Regione</th>
                                        <th style="padding: 0.75rem; font-weight: 700; width: 100px;">CAP</th>
                                        <th style="padding: 0.75rem; font-weight: 700; width: 100px;">Cod. Catastale</th>
                                        <th style="padding: 0.75rem; font-weight: 700; text-align: right; width: 110px;">Popolazione</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 700; text-align: right; width: 100px;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody id="tabella-comuni-corpo"></tbody>
                            </table>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.5rem;">
                            <div id="info-paginazione" style="font-size: 0.85rem; color: var(--md-on-surface-variant);"></div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="k-btn k-btn--sm" id="btn-pag-prev" style="padding: 0.4rem 0.8rem; border-radius: 6px;">Precedente</button>
                                <button type="button" class="k-btn k-btn--sm" id="btn-pag-next" style="padding: 0.4rem 0.8rem; border-radius: 6px;">Successiva</button>
                            </div>
                        </div>
                    </div>

                    <div id="modal-container"></div>
                </div>
            `;

            function filtraComuni() {
                try {
                    const q = filtroTesto.trim().toLowerCase();
                    return tuttiComuni.filter(c => {
                        if (filtroRegione) {
                            const reg = (c.regione && (c.regione.nome || c.regione)) || '';
                            if (reg !== filtroRegione) return false;
                        }
                        if (filtroProvincia) {
                            if (c.sigla !== filtroProvincia) return false;
                        }
                        if (q) {
                            const nome = (c.nome || '').toLowerCase();
                            const sigla = (c.sigla || '').toLowerCase();
                            const cap = Array.isArray(c.cap) ? c.cap.join(' ') : (c.cap || '');
                            const cat = (c.codiceCatastale || '').toLowerCase();
                            return nome.includes(q) || sigla === q || cap.includes(q) || cat.includes(q);
                        }
                        return true;
                    });
                } catch (e) {
                    return [];
                }
            }

            function renderizzaTabella() {
                try {
                    const filtrati = filtraComuni();
                    const totale = filtrati.length;
                    const totalePagine = Math.max(1, Math.ceil(totale / perPagina));
                    if (paginaCorrente > totalePagine) paginaCorrente = totalePagine;
                    if (paginaCorrente < 1) paginaCorrente = 1;

                    const inizio = (paginaCorrente - 1) * perPagina;
                    const paginaRighe = filtrati.slice(inizio, inizio + perPagina);

                    const tbody = el.querySelector('#tabella-comuni-corpo');
                    if (paginaRighe.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--md-on-surface-variant);">Nessun comune trovato corrispondente ai filtri</td></tr>`;
                    } else {
                        tbody.innerHTML = paginaRighe.map((c, i) => {
                            const reg = (c.regione && (c.regione.nome || c.regione)) || '—';
                            const cap = Array.isArray(c.cap) ? c.cap[0] : (c.cap || '—');
                            const pop = c.popolazione ? Number(c.popolazione).toLocaleString('it-IT') : '—';
                            const bg = i % 2 === 0 ? 'transparent' : 'var(--md-surface-container-low, #fafbfc)';
                            return `
                                <tr style="background: ${bg}; border-bottom: 1px solid var(--md-outline-variant, #f1f5f9);">
                                    <td style="padding: 0.75rem 1rem; font-weight: 600; color: var(--md-on-surface);">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span class="material-symbols-rounded" style="font-size: 16px; color: var(--md-primary, #0284c7);">location_on</span>
                                            <span>${esc(c.nome)}</span>
                                        </div>
                                    </td>
                                    <td style="padding: 0.75rem; text-align: center;">
                                        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: var(--md-surface-container-high, #f1f5f9);">${esc(c.sigla || '—')}</span>
                                    </td>
                                    <td style="padding: 0.75rem; color: var(--md-on-surface-variant);">${esc(reg)}</td>
                                    <td style="padding: 0.75rem; font-family: monospace; font-size: 0.85rem;">${esc(cap)}</td>
                                    <td style="padding: 0.75rem; font-family: monospace; font-size: 0.85rem;">${esc(c.codiceCatastale || '—')}</td>
                                    <td style="padding: 0.75rem; text-align: right; color: var(--md-on-surface-variant);">${esc(pop)}</td>
                                    <td style="padding: 0.75rem 1rem; text-align: right;">
                                        <button type="button" class="btn-modifica" data-cat="${esc(c.codiceCatastale || '')}" data-nome="${esc(c.nome || '')}" data-sigla="${esc(c.sigla || '')}" style="background: none; border: none; cursor: pointer; color: var(--md-primary, #0284c7); padding: 4px;" title="Modifica">
                                            <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('');
                    }

                    const infoPag = el.querySelector('#info-paginazione');
                    infoPag.textContent = `Visualizzati da ${totale === 0 ? 0 : inizio + 1} a ${Math.min(inizio + perPagina, totale)} di ${totale.toLocaleString('it-IT')} comuni (Pagina ${paginaCorrente} di ${totalePagine})`;

                    el.querySelector('#btn-pag-prev').disabled = (paginaCorrente <= 1);
                    el.querySelector('#btn-pag-next').disabled = (paginaCorrente >= totalePagine);

                    tbody.querySelectorAll('.btn-modifica').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const cat = btn.getAttribute('data-cat');
                            const nome = btn.getAttribute('data-nome');
                            const sigla = btn.getAttribute('data-sigla');
                            const trovato = tuttiComuni.find(c => (cat && c.codiceCatastale === cat) || (c.nome === nome && c.sigla === sigla));
                            if (trovato) apriModalComune(trovato);
                        });
                    });
                } catch (e) {
                    console.error('Errore in renderizzaTabella:', e);
                }
            }

            function apriModalComune(comune = null) {
                try {
                    const isNuovo = !comune;
                    const c = comune || { nome: '', sigla: '', cap: [''], regione: { nome: '' }, codiceCatastale: '', popolazione: '' };
                    const capVal = Array.isArray(c.cap) ? (c.cap[0] || '') : (c.cap || '');
                    const regVal = (c.regione && (c.regione.nome || c.regione)) || '';

                    const modalDiv = el.querySelector('#modal-container');
                    modalDiv.innerHTML = `
                        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999999; backdrop-filter: blur(4px);">
                            <div class="k-card" style="width: 90%; max-width: 520px; padding: 1.5rem; border-radius: 12px; background: var(--md-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                                <h3 style="margin: 0 0 1rem; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">
                                    ${isNuovo ? 'Nuovo Comune' : 'Modifica Comune'}
                                </h3>
                                <form id="form-comune" style="display: flex; flex-direction: column; gap: 0.85rem;">
                                    <div>
                                        <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">Nome Comune *</label>
                                        <input type="text" name="nome" class="k-input" value="${esc(c.nome)}" required style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--md-outline-variant);">
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                        <div>
                                            <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">Sigla Provincia *</label>
                                            <input type="text" name="sigla" class="k-input" value="${esc(c.sigla)}" required maxlength="4" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--md-outline-variant); text-transform: uppercase;">
                                        </div>
                                        <div>
                                            <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">CAP Principale *</label>
                                            <input type="text" name="cap" class="k-input" value="${esc(capVal)}" required maxlength="10" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--md-outline-variant);">
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                        <div>
                                            <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">Regione</label>
                                            <input type="text" name="regione" class="k-input" value="${esc(regVal)}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--md-outline-variant);">
                                        </div>
                                        <div>
                                            <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">Codice Catastale</label>
                                            <input type="text" name="codiceCatastale" class="k-input" value="${esc(c.codiceCatastale || '')}" maxlength="6" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--md-outline-variant); text-transform: uppercase;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem;">Popolazione stimata</label>
                                        <input type="number" name="popolazione" class="k-input" value="${esc(c.popolazione || '')}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--md-outline-variant);">
                                    </div>
                                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                                        <button type="button" id="btn-annulla-modal" class="k-btn k-btn--ghost" style="padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">Annulla</button>
                                        <button type="submit" class="k-btn k-btn--primary" style="padding: 0.5rem 1.25rem; border-radius: 6px; font-weight: 600; cursor: pointer;">Salva</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    `;

                    modalDiv.querySelector('#btn-annulla-modal').addEventListener('click', () => {
                        modalDiv.innerHTML = '';
                    });

                    modalDiv.querySelector('#form-comune').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        try {
                            const fd = new FormData(e.target);
                            const salvato = {
                                nome: (fd.get('nome') || '').trim(),
                                sigla: (fd.get('sigla') || '').trim().toUpperCase(),
                                cap: [(fd.get('cap') || '').trim()],
                                regione: { nome: (fd.get('regione') || '').trim() },
                                codiceCatastale: (fd.get('codiceCatastale') || '').trim().toUpperCase(),
                                popolazione: Number(fd.get('popolazione')) || 0
                            };

                            if (window.electronAPI && window.electronAPI.comuni && typeof window.electronAPI.comuni.save === 'function') {
                                await window.electronAPI.comuni.save(salvato);
                            }

                            const idx = tuttiComuni.findIndex(x => (salvato.codiceCatastale && x.codiceCatastale === salvato.codiceCatastale) || (x.nome.toLowerCase() === salvato.nome.toLowerCase() && x.sigla === salvato.sigla));
                            if (idx >= 0) {
                                tuttiComuni[idx] = { ...tuttiComuni[idx], ...salvato };
                            } else {
                                tuttiComuni.unshift(salvato);
                            }

                            el.querySelector('#stat-totale').textContent = tuttiComuni.length.toLocaleString('it-IT');
                            modalDiv.innerHTML = '';
                            renderizzaTabella();
                        } catch (err) {}
                    });
                } catch (e) {}
            }

            el.querySelector('#btn-crea-comune').addEventListener('click', () => {
                apriModalComune(null);
            });

            el.querySelector('#input-cerca').addEventListener('input', (e) => {
                filtroTesto = e.target.value;
                paginaCorrente = 1;
                renderizzaTabella();
            });

            el.querySelector('#select-regione').addEventListener('change', (e) => {
                filtroRegione = e.target.value;
                paginaCorrente = 1;
                renderizzaTabella();
            });

            el.querySelector('#select-provincia').addEventListener('change', (e) => {
                filtroProvincia = e.target.value;
                paginaCorrente = 1;
                renderizzaTabella();
            });

            el.querySelector('#btn-pag-prev').addEventListener('click', () => {
                if (paginaCorrente > 1) {
                    paginaCorrente--;
                    renderizzaTabella();
                }
            });

            el.querySelector('#btn-pag-next').addEventListener('click', () => {
                paginaCorrente++;
                renderizzaTabella();
            });

            renderizzaTabella();
        } catch (e) {
            el.innerHTML = '<div style="color:red; padding: 20px;"><h2>Errore Critico</h2><pre>' + String(e.stack || e) + '</pre></div>';
        }
    }
};
