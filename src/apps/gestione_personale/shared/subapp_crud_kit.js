import { toast, conferma } from '../../../js/utils.js';
import { esc } from '../../../js/shared/html.js';
import { icona3d } from '../../../js/shared/tinte.js';
import { creaProcedura } from '../../../js/shared/procedura.js';
import { mountPersonaPicker } from './persona_picker.js';
import { mountAuditButton } from './audit_trail_button.js';
import { populateProvinceDatalist, populateNazioniDatalist, populateSuggestionDatalist, populateComuniDatalist, getComuniCache } from './riferimenti.js';
import { tono, attributoTono, heroHtml, guidaHtml, campoHtml, leggiCampo, toISODate, apriModale, chiudiModale, mostraErrore } from './ui_kit.js';

const CAMPI_PER_PASSO = 4;

function populateFieldDatalists(el, fields) {
    for (const field of fields) {
        if (!field.datalist) continue;
        const datalistEl = el.querySelector(`#dl-${field.key}`);
        if (!datalistEl) continue;
        if (field.datalist === 'province') populateProvinceDatalist(datalistEl);
        else if (field.datalist === 'nazioni') populateNazioniDatalist(datalistEl);
        else if (field.datalist === 'comuni') populateComuniDatalist(datalistEl);
        else populateSuggestionDatalist(datalistEl, field.datalist.table, field.datalist.column);
    }
}

function collegaComuni(el, fields) {
    for (const field of fields) {
        if (field.datalist !== 'comuni') continue;
        const input = el.querySelector(`#crud-field-${field.key}`);
        if (!input) continue;
        input.addEventListener('input', () => {
            const cercato = input.value.trim().toLowerCase();
            const comune = getComuniCache().find(c => c.n.toLowerCase() === cercato);
            if (!comune) return;
            const provincia = el.querySelector('#crud-field-provincia');
            if (provincia) provincia.value = comune.p;
            const cap = el.querySelector('#crud-field-cap');
            if (cap) cap.value = comune.c;
        });
    }
}

/* I campi vengono distribuiti su passaggi da quattro: ogni schermata entra
   nell altezza disponibile, quindi la barra di scorrimento non compare mai
   mentre si scrive. Un gruppo dichiarato dal chiamante vince sulla divisione
   automatica, cosi i campi che si leggono insieme restano insieme. */
function costruisciPassi(fields, zonaBase) {
    const gruppi = new Map();
    let automatico = 0;
    for (const field of fields) {
        const chiave = field.gruppo || `parte-${Math.floor(automatico / CAMPI_PER_PASSO) + 1}`;
        if (!field.gruppo) automatico += 1;
        if (!gruppi.has(chiave)) gruppi.set(chiave, []);
        gruppi.get(chiave).push(field);
    }
    const totale = gruppi.size;
    return Array.from(gruppi.entries()).map(([chiave, campi], indice) => {
        const primo = campi.find(c => c.gruppoEtichetta) || campi[0];
        return {
            id: `passo-${indice + 1}`,
            zona: campi.find(c => c.zona)?.zona || zonaBase,
            icona: primo.gruppoIcona || primo.icon || null,
            etichetta: primo.gruppoEtichetta || (totale > 1 ? `Parte ${indice + 1}` : 'Dati'),
            titolo: primo.gruppoEtichetta || (totale > 1 ? `Parte ${indice + 1} di ${totale}` : 'Compila i dati'),
            nota: primo.gruppoNota || '',
            corpo: `<div class="ak-form-grid">${campi.map(f => campoHtml(f, '')).join('')}</div>`
        };
    });
}

export function renderPersonScopedCrudSubapp(el, config) {
    const {
        title, subtitle, icon, tone = 'blue', api, fields, newLabel, emptyLabel,
        cardTitle, cardSubtitle, cardMeta, cardBadge, fixedPersona, tableName,
        instructions, modalHint, embedded = false, recordsTitle = 'Elenco'
    } = config;

    const scelto = tono(tone);
    const attributo = attributoTono(tone);
    const iconaScheda = icon || scelto.icon;
    const zonaBase = scelto.zona;
    const passi = costruisciPassi(fields, zonaBase);

    el.innerHTML = `
        <div class="k-schermo fade-in-up${embedded ? ' k-schermo--pieno k-schermo--compatto' : ''}"${attributo} data-radice-app>
            <div class="k-schermo-testa">
                ${embedded ? '' : heroHtml({ title, subtitle, icon: iconaScheda, tone })}
                ${instructions ? guidaHtml({ intro: instructions.intro, steps: instructions.steps, tone }) : ''}
                ${fixedPersona ? '' : '<div class="ak-panel ak-panel--fisso" style="flex: 1 1 100%;"><div class="ak-panel-body" id="crud-kit-picker"></div></div>'}
            </div>
            <div class="k-schermo-corpo k-schermo-corpo--fisso">
                <section id="crud-kit-records" class="ak-panel" hidden>
                    <div class="ak-toolbar">
                        <h3>${esc(recordsTitle)}<span class="ak-count" id="crud-kit-count">0</span></h3>
                        <button type="button" id="crud-kit-btn-new" class="ak-btn ak-btn-primary">
                            <span class="material-symbols-rounded">add</span>${esc(newLabel)}
                        </button>
                    </div>
                    <div class="ak-panel-body" id="crud-kit-grid"></div>
                </section>
            </div>
        </div>
        <div id="crud-kit-modal" class="ak-modal" data-aperta="no"${attributo} role="dialog" aria-modal="true" aria-labelledby="crud-kit-modal-title">
            <div class="ak-modal-card">
                <div class="ak-modal-head">
                    <h3 id="crud-kit-modal-title">
                        <span class="material-symbols-rounded">${esc(iconaScheda)}</span>
                        <span id="crud-kit-modal-title-text"></span>
                    </h3>
                    <button type="button" id="crud-kit-btn-close" class="ak-iconbtn" aria-label="Chiudi finestra"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="ak-modal-body">
                    ${modalHint ? `<div class="ak-modal-hint"><span class="material-symbols-rounded">lightbulb</span><span>${modalHint}</span></div>` : ''}
                    <form id="crud-kit-form" class="ak-form" novalidate>
                        <input type="hidden" id="crud-field-id">
                        <div id="crud-kit-passi"></div>
                        <div id="crud-kit-modal-error" class="ak-error" data-visibile="no" role="alert"></div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const recordsSection = el.querySelector('#crud-kit-records');
    const grid = el.querySelector('#crud-kit-grid');
    const countEl = el.querySelector('#crud-kit-count');
    const modal = el.querySelector('#crud-kit-modal');
    const form = el.querySelector('#crud-kit-form');
    const modalError = el.querySelector('#crud-kit-modal-error');
    const passiBox = el.querySelector('#crud-kit-passi');

    let currentPersona = null;
    let records = [];

    const procedura = creaProcedura(passiBox, {
        id: 'crud',
        passi,
        etichettaFine: 'Salva',
        etichettaAnnulla: 'Annulla',
        onAnnulla: () => chiudiModale(modal),
        onFine: () => salva()
    });

    populateFieldDatalists(el, fields);
    collegaComuni(el, fields);

    function renderRecords() {
        countEl.textContent = String(records.length);
        if (typeof config.onChange === 'function') config.onChange(records.length);
        if (records.length === 0) {
            grid.innerHTML = `
                <div class="ak-empty">
                    ${icona3d(iconaScheda, { dimensione: 'lg', varianti: ['tenue'] })}
                    <h4>Ancora niente qui</h4>
                    <p>${esc(emptyLabel || 'Nessun elemento registrato.')}</p>
                </div>`;
            return;
        }
        grid.innerHTML = `<div class="ak-cards">${records.map(r => {
            const badge = cardBadge ? cardBadge(r) : null;
            const sottotitolo = cardSubtitle ? cardSubtitle(r) : null;
            const meta = cardMeta ? cardMeta(r) : null;
            return `
                <article class="ak-card fade-in-up">
                    ${badge ? `<span class="ak-card-badge">${esc(badge)}</span>` : ''}
                    <div class="ak-card-title">${esc(cardTitle(r))}</div>
                    ${sottotitolo ? `<div class="ak-card-sub">${esc(sottotitolo)}</div>` : ''}
                    ${meta ? `<div class="ak-card-meta"><span class="material-symbols-rounded" aria-hidden="true">info</span>${esc(meta)}</div>` : ''}
                    <div class="ak-card-actions">
                        <div class="crud-kit-audit-mount" data-id="${esc(r.id)}"></div>
                        <button type="button" class="ak-iconbtn crud-kit-btn-edit" data-id="${esc(r.id)}" title="Modifica" aria-label="Modifica"><span class="material-symbols-rounded">edit</span></button>
                        <button type="button" class="ak-iconbtn danger crud-kit-btn-delete" data-id="${esc(r.id)}" title="Elimina" aria-label="Elimina"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                </article>`;
        }).join('')}</div>`;

        if (tableName) {
            for (const mount of grid.querySelectorAll('.crud-kit-audit-mount')) {
                const id = mount.getAttribute('data-id');
                const record = records.find(r => r.id === id);
                mountAuditButton(mount, { tableName, recordId: id, label: record ? cardTitle(record) : '' });
            }
        }
        for (const btn of grid.querySelectorAll('.crud-kit-btn-edit')) {
            btn.addEventListener('click', () => {
                const record = records.find(r => r.id === btn.getAttribute('data-id'));
                if (record) openModal(record);
            });
        }
        for (const btn of grid.querySelectorAll('.crud-kit-btn-delete')) {
            btn.addEventListener('click', async () => {
                if (!(await conferma({ titolo: 'Eliminare questo elemento?', testo: 'L\'operazione non è reversibile.', etichetta: 'Elimina', pericolosa: true }))) return;
                try {
                    await api.remove({ id: btn.getAttribute('data-id') });
                    toast('Eliminato con successo', 'success');
                    await loadRecords();
                } catch (e) {
                    toast(e.message || "Errore durante l'eliminazione", 'error');
                }
            });
        }
    }

    async function loadRecords() {
        try {
            records = await api.getByPersona({ personaId: currentPersona.id });
            renderRecords();
        } catch (e) {
            grid.innerHTML = `
                <div class="ak-empty">
                    ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                    <h4>Caricamento non riuscito</h4>
                    <p>${esc(e.message || 'Errore sconosciuto.')}</p>
                </div>`;
        }
    }

    function openModal(record = null) {
        mostraErrore(modalError, '');
        el.querySelector('#crud-kit-modal-title-text').textContent = record ? 'Modifica' : newLabel;
        el.querySelector('#crud-field-id').value = record ? record.id : '';
        for (const f of fields) {
            const input = el.querySelector(`#crud-field-${f.key}`);
            if (!input) continue;
            const valore = record ? record[f.key] : (f.default !== undefined ? f.default : '');
            if (f.type === 'checkbox') input.checked = Boolean(valore);
            else if (f.type === 'date') input.value = toISODate(valore);
            else input.value = valore === undefined || valore === null ? '' : valore;
        }
        if (procedura) procedura.vaiA(0, { valida: false });
        apriModale(modal);
    }

    async function salva() {
        mostraErrore(modalError, '');
        const btnSave = passiBox.querySelector('[data-ruolo="fine"]');
        if (btnSave) btnSave.disabled = true;
        try {
            const id = el.querySelector('#crud-field-id').value;
            const dati = { persona_id: currentPersona.id };
            for (const f of fields) dati[f.key] = leggiCampo(el, f);
            if (id) {
                dati.id = id;
                await api.update(dati);
            } else {
                await api.create(dati);
            }
            toast('Salvato con successo', 'success');
            chiudiModale(modal);
            await loadRecords();
        } catch (e) {
            mostraErrore(modalError, e.message || 'Errore durante il salvataggio.');
        } finally {
            if (btnSave) btnSave.disabled = false;
        }
    }

    el.querySelector('#crud-kit-btn-new').addEventListener('click', () => openModal());
    el.querySelector('#crud-kit-btn-close').addEventListener('click', () => chiudiModale(modal));
    modal.addEventListener('click', (evento) => { if (evento.target === modal) chiudiModale(modal); });
    const allaFuga = (evento) => {
        if (evento.key === 'Escape' && modal.dataset.aperta === 'si') chiudiModale(modal);
    };
    document.addEventListener('keydown', allaFuga);
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!procedura) return;
        const problema = await procedura.concludi();
        if (problema) mostraErrore(modalError, problema);
    });

    if (fixedPersona) {
        currentPersona = fixedPersona;
        recordsSection.hidden = false;
        loadRecords();
    } else {
        mountPersonaPicker(el.querySelector('#crud-kit-picker'), {
            onSelect: async (persona) => {
                currentPersona = persona;
                recordsSection.hidden = false;
                await loadRecords();
            }
        });
    }

    return {
        ricarica: loadRecords,
        distruggi: () => {
            document.removeEventListener('keydown', allaFuga);
            if (procedura) procedura.distruggi();
        }
    };
}
