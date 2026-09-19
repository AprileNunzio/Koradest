import { toast } from '../../../js/utils.js';
import { esc } from '../../../js/shared/html.js';
import { icona3d } from '../../../js/shared/tinte.js';
import { isValidCodiceFiscale } from './validators.js';

const nomeCompleto = (p) => `${p.cognome || ''} ${p.nome || ''}`.trim() || 'Senza nome';

export function mountPersonaPicker(container, options = {}) {
    const { onSelect, allowCreateInline = true, initialPersona = null } = options;

    container.innerHTML = `
        <div class="persona-picker" data-zona="identita">
            <label class="k-cerca" id="persona-picker-search-group">
                <span class="material-symbols-rounded">search</span>
                <input type="search" id="persona-picker-input" placeholder="Cerca persona per nome, cognome o codice fiscale…" aria-label="Cerca persona">
            </label>
            <div id="persona-picker-results" class="persona-picker-results"></div>
            <div id="persona-picker-selected" class="persona-picker-selected" hidden></div>
        </div>
    `;

    const input = container.querySelector('#persona-picker-input');
    const searchGroup = container.querySelector('#persona-picker-search-group');
    const results = container.querySelector('#persona-picker-results');
    const selectedBox = container.querySelector('#persona-picker-selected');
    let attesa = null;
    let selezionata = null;

    function renderSelected(persona) {
        selezionata = persona;
        searchGroup.hidden = true;
        results.innerHTML = '';
        selectedBox.hidden = false;
        selectedBox.innerHTML = `
            <div class="persona-picker-chip">
                ${icona3d('person', { dimensione: 'sm' })}
                <div class="persona-picker-chip-corpo">
                    <div class="persona-picker-chip-name">${esc(nomeCompleto(persona))}</div>
                    <div class="persona-picker-chip-cf">${esc(persona.codice_fiscale || 'Codice Fiscale non specificato')}</div>
                </div>
                <button type="button" id="persona-picker-change" class="btn-icon-action" title="Cambia persona" aria-label="Cambia persona">
                    <span class="material-symbols-rounded">swap_horiz</span>
                </button>
            </div>
        `;
        selectedBox.querySelector('#persona-picker-change').addEventListener('click', reset);
        if (typeof onSelect === 'function') onSelect(persona);
    }

    function reset() {
        selezionata = null;
        searchGroup.hidden = false;
        selectedBox.hidden = true;
        selectedBox.innerHTML = '';
        input.value = '';
        results.innerHTML = '';
        input.focus();
    }

    function renderResults(elenco, cercato) {
        if (elenco.length === 0) {
            results.innerHTML = `
                <div class="persona-picker-empty">
                    <span>Nessuna persona trovata.</span>
                    ${allowCreateInline ? '<button type="button" id="persona-picker-create-new" class="k-btn k-btn--sezione"><span class="material-symbols-rounded">person_add</span>Crea nuova persona</button>' : ''}
                </div>`;
            if (allowCreateInline) {
                results.querySelector('#persona-picker-create-new').addEventListener('click', () => openInlineCreate(cercato));
            }
            return;
        }
        results.innerHTML = elenco.map(p => `
            <button type="button" class="persona-picker-item" data-id="${esc(p.id)}">
                ${icona3d('person', { dimensione: 'sm', varianti: ['tenue', 'reattiva'] })}
                <span>
                    <span class="persona-picker-item-name">${esc(nomeCompleto(p))}</span>
                    <span class="persona-picker-item-cf">${esc(p.codice_fiscale || '')}</span>
                </span>
            </button>
        `).join('');
        for (const voce of results.querySelectorAll('.persona-picker-item')) {
            voce.addEventListener('click', () => {
                const persona = elenco.find(p => p.id === voce.getAttribute('data-id'));
                if (persona) renderSelected(persona);
            });
        }
    }

    function openInlineCreate(cercato) {
        const parti = (cercato || '').trim().split(/\s+/).filter(Boolean);
        const cognomeIniziale = parti[0] || '';
        const nomeIniziale = parti.slice(1).join(' ');
        results.innerHTML = `
            <div class="persona-picker-create-form">
                <div class="ak-form-grid">
                    <div class="ak-field">
                        <label class="ak-flabel" for="persona-picker-new-cognome">Cognome<span class="ak-req" aria-hidden="true">*</span></label>
                        <div class="ak-inputbox">
                            <span class="material-symbols-rounded ak-ficon" aria-hidden="true">badge</span>
                            <input type="text" id="persona-picker-new-cognome" class="ak-input" maxlength="80" value="${esc(cognomeIniziale)}" required>
                        </div>
                    </div>
                    <div class="ak-field">
                        <label class="ak-flabel" for="persona-picker-new-nome">Nome<span class="ak-req" aria-hidden="true">*</span></label>
                        <div class="ak-inputbox">
                            <span class="material-symbols-rounded ak-ficon" aria-hidden="true">person</span>
                            <input type="text" id="persona-picker-new-nome" class="ak-input" maxlength="80" value="${esc(nomeIniziale)}" required>
                        </div>
                    </div>
                    <div class="ak-field" style="grid-column:1/-1;">
                        <label class="ak-flabel" for="persona-picker-new-cf">Codice Fiscale<span class="ak-req" aria-hidden="true">*</span></label>
                        <div class="ak-inputbox">
                            <span class="material-symbols-rounded ak-ficon" aria-hidden="true">fingerprint</span>
                            <input type="text" id="persona-picker-new-cf" class="ak-input" maxlength="16" style="text-transform:uppercase;" required>
                        </div>
                        <small class="ak-hint">È la chiave univoca della persona: dopo il salvataggio non è più modificabile.</small>
                    </div>
                </div>
                <div class="persona-picker-create-azioni">
                    <button type="button" id="persona-picker-cancel-new" class="k-btn k-btn--ghost">Annulla</button>
                    <button type="button" id="persona-picker-save-new" class="k-btn k-btn--sezione"><span class="material-symbols-rounded">save</span>Salva Persona</button>
                </div>
            </div>
        `;
        results.querySelector('#persona-picker-cancel-new').addEventListener('click', () => { results.innerHTML = ''; });
        results.querySelector('#persona-picker-save-new').addEventListener('click', async (evento) => {
            const tasto = evento.currentTarget;
            const cognome = results.querySelector('#persona-picker-new-cognome').value.trim();
            const nome = results.querySelector('#persona-picker-new-nome').value.trim();
            const codiceFiscale = results.querySelector('#persona-picker-new-cf').value.trim().toUpperCase();
            if (!nome || !cognome) {
                toast('Nome e Cognome sono obbligatori', 'error');
                return;
            }
            if (!isValidCodiceFiscale(codiceFiscale)) {
                toast('Il Codice Fiscale è obbligatorio e deve essere valido', 'error');
                return;
            }
            tasto.disabled = true;
            try {
                const creata = await window.electronAPI.anagrafica.persone.create({ nome, cognome, codice_fiscale: codiceFiscale });
                const persona = await window.electronAPI.anagrafica.persone.getById({ id: creata.id });
                toast('Persona creata con successo', 'success');
                renderSelected(persona);
            } catch (e) {
                toast(e.message || 'Errore durante la creazione della persona', 'error');
            } finally {
                tasto.disabled = false;
            }
        });
    }

    input.addEventListener('input', () => {
        clearTimeout(attesa);
        const cercato = input.value.trim();
        if (cercato.length < 2) {
            results.innerHTML = '';
            return;
        }
        attesa = setTimeout(async () => {
            try {
                const trovate = await window.electronAPI.anagrafica.persone.search({ query: cercato });
                renderResults(Array.isArray(trovate) ? trovate : [], cercato);
            } catch (e) {
                toast('Errore durante la ricerca: ' + (e.message || 'errore sconosciuto'), 'error');
            }
        }, 300);
    });

    if (initialPersona) renderSelected(initialPersona);

    return {
        getSelected: () => selezionata,
        reset
    };
}
