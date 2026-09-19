import { toast, conferma } from '../../../js/utils.js';
import { esc } from '../../../js/shared/html.js';
import { icona3d } from '../../../js/shared/tinte.js';
import { creaProcedura } from '../../../js/shared/procedura.js';
import { attributoTono, apriModale, chiudiModale, mostraErrore } from './ui_kit.js';

const CATEGORIE = ['Telefono', 'Email', 'Social', 'Web', 'VoIP', 'Emergenza', 'Altro'];

const TIPI_PER_CATEGORIA = {
    Telefono: ['Cellulare', 'Lavoro', 'Fisso', 'Aziendale', 'Fax'],
    Email: ['Personale', 'Lavoro', 'PEC'],
    Social: ['LinkedIn', 'Facebook', 'Instagram', 'Twitter', 'TikTok', 'YouTube', 'Twitch'],
    Web: ['Sito Personale', 'Portfolio', 'Sito Aziendale', 'Blog'],
    VoIP: ['Skype', 'Zoom', 'Teams', 'Google Meet', 'Discord'],
    Emergenza: ['Parente', 'Amico', 'Medico'],
    Altro: ['Personalizzato']
};

const ICONE = {
    Telefono: 'phone',
    Email: 'email',
    Social: 'share',
    Web: 'language',
    VoIP: 'headset_mic',
    Emergenza: 'medical_services',
    Altro: 'contact_mail'
};

const TIPI_VALORE = { Email: 'email', Telefono: 'tel', Emergenza: 'tel', Web: 'url' };

const passoCategoria = () => `
    <div class="ak-form-grid">
        <div class="ak-field">
            <label class="ak-flabel" for="ct-categoria">Categoria<span class="ak-req" aria-hidden="true">*</span></label>
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">category</span>
                <select id="ct-categoria" class="ak-input" required>
                    <option value="" disabled selected hidden>Seleziona…</option>
                    ${CATEGORIE.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
                </select>
                <span class="material-symbols-rounded ak-fcaret" aria-hidden="true">unfold_more</span>
            </div>
            <small class="ak-hint">Il gruppo in cui finirà il contatto.</small>
        </div>
        <div class="ak-field">
            <label class="ak-flabel" for="ct-tipo">Tipo<span class="ak-req" aria-hidden="true">*</span></label>
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">label</span>
                <input type="text" id="ct-tipo" class="ak-input" list="ct-tipi-list" placeholder="es. Cellulare, PEC…" maxlength="40" required>
                <datalist id="ct-tipi-list"></datalist>
            </div>
            <small class="ak-hint">Etichetta del recapito.</small>
        </div>
    </div>
`;

const passoValore = () => `
    <div class="ak-form-grid">
        <div class="ak-field" style="grid-column:1/-1;">
            <label class="ak-flabel" for="ct-valore">Valore<span class="ak-req" aria-hidden="true">*</span></label>
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">alternate_email</span>
                <input type="text" id="ct-valore" class="ak-input" placeholder="Numero, email o link…" maxlength="200" required>
            </div>
            <small class="ak-hint">Il recapito vero e proprio: numero, indirizzo email oppure indirizzo web.</small>
        </div>
        <div class="ak-field" style="grid-column:1/-1;">
            <label class="ak-flabel" for="ct-note">Note</label>
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">sticky_note_2</span>
                <input type="text" id="ct-note" class="ak-input" placeholder="Dettagli aggiuntivi…" maxlength="200">
            </div>
        </div>
        <label class="ak-check" for="ct-principale" style="grid-column:1/-1;">
            <input type="checkbox" id="ct-principale">
            <span class="ak-check-box" aria-hidden="true"><span class="material-symbols-rounded">check</span></span>
            <span class="ak-check-text">Contatto principale<small class="ak-hint">Verrà evidenziato con una stella nella rubrica.</small></span>
        </label>
    </div>
`;

export function mountContattiSection(el, opts = {}) {
    const { persona, tone = 'violet', onChange } = opts;
    const attributo = attributoTono(tone);

    if (!persona || !persona.id) {
        el.innerHTML = `<div class="ak-empty">${icona3d('person_off', { dimensione: 'lg', varianti: ['tenue'] })}<h4>Nessuna persona selezionata</h4></div>`;
        return;
    }

    el.innerHTML = `
        <div class="k-schermo k-schermo--pieno k-schermo--compatto"${attributo} data-radice-app>
            <div class="k-schermo-corpo k-schermo-corpo--fisso">
                <section class="ak-panel">
                    <div class="ak-toolbar">
                        <h3>Recapiti<span class="ak-count" id="ct-count">0</span></h3>
                        <button type="button" id="ct-add" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">add_ic_call</span>Nuovo Contatto</button>
                    </div>
                    <div class="ak-panel-body" id="ct-list"></div>
                </section>
            </div>
        </div>
        <div id="ct-modal" class="ak-modal" data-aperta="no"${attributo} role="dialog" aria-modal="true" aria-labelledby="ct-modal-title">
            <div class="ak-modal-card ak-modal-card--stretta">
                <div class="ak-modal-head">
                    <h3 id="ct-modal-title"><span class="material-symbols-rounded">contact_phone</span><span id="ct-modal-title-text">Nuovo Contatto</span></h3>
                    <button type="button" id="ct-close" class="ak-iconbtn" aria-label="Chiudi finestra"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="ak-modal-body">
                    <div class="ak-modal-hint">
                        <span class="material-symbols-rounded">lightbulb</span>
                        <span>Scegli prima la categoria: i tipi suggeriti e il formato del valore si adattano di conseguenza.</span>
                    </div>
                    <form id="ct-form" class="ak-form" novalidate>
                        <input type="hidden" id="ct-id">
                        <div id="ct-passi"></div>
                        <div id="ct-error" class="ak-error" data-visibile="no" role="alert"></div>
                        <div class="ak-actions">
                            <button type="button" id="ct-delete" class="ak-btn ak-btn-danger" hidden><span class="material-symbols-rounded">delete</span>Elimina</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const listBox = el.querySelector('#ct-list');
    const modal = el.querySelector('#ct-modal');
    const form = el.querySelector('#ct-form');
    const errorBox = el.querySelector('#ct-error');
    const titleText = el.querySelector('#ct-modal-title-text');
    const btnDelete = el.querySelector('#ct-delete');
    const countEl = el.querySelector('#ct-count');

    const procedura = creaProcedura(el.querySelector('#ct-passi'), {
        id: 'contatto',
        passi: [
            { id: 'categoria', zona: 'contatti', etichetta: 'Categoria', titolo: 'Che tipo di recapito è', nota: 'La categoria decide i suggerimenti del passaggio successivo.', corpo: passoCategoria() },
            { id: 'valore', zona: 'contatti', etichetta: 'Recapito', titolo: 'Il recapito', nota: 'Il valore viene controllato in base alla categoria scelta.', corpo: passoValore() }
        ],
        etichettaAnnulla: 'Annulla',
        onAnnulla: () => chiudiModale(modal),
        onFine: () => salva()
    });

    const inId = el.querySelector('#ct-id');
    const inCat = el.querySelector('#ct-categoria');
    const inTipo = el.querySelector('#ct-tipo');
    const inVal = el.querySelector('#ct-valore');
    const inPrin = el.querySelector('#ct-principale');
    const inNote = el.querySelector('#ct-note');
    const dlTipi = el.querySelector('#ct-tipi-list');

    let contatti = [];

    const cardHtml = (c, icona) => `
        <button type="button" class="ct-card" data-id="${esc(c.id)}">
            ${c.is_principale === 1 ? '<span class="material-symbols-rounded ct-card-stella" title="Contatto principale" aria-hidden="true">star</span>' : ''}
            ${icona3d(icona, { dimensione: 'sm', varianti: ['tenue', 'reattiva'] })}
            <span class="ct-card-corpo">
                <span class="ct-card-valore">${esc(c.valore)}</span>
                <span class="ct-card-tipo">${esc(c.tipo)}</span>
                ${c.note ? `<span class="ct-card-nota">${esc(c.note)}</span>` : ''}
            </span>
        </button>
    `;

    function render() {
        countEl.textContent = String(contatti.length);
        if (contatti.length === 0) {
            listBox.innerHTML = `
                <div class="ak-empty">
                    ${icona3d('contacts', { dimensione: 'lg', varianti: ['tenue'] })}
                    <h4>Nessun recapito registrato</h4>
                    <p>Aggiungi telefono, email, profili social oppure contatti di emergenza.</p>
                </div>`;
            return;
        }
        const gruppi = new Map();
        for (const c of contatti) {
            const categoria = c.categoria || 'Altro';
            if (!gruppi.has(categoria)) gruppi.set(categoria, []);
            gruppi.get(categoria).push(c);
        }
        const ordine = [...CATEGORIE, ...[...gruppi.keys()].filter(c => !CATEGORIE.includes(c))];
        listBox.innerHTML = ordine.filter(cat => gruppi.has(cat)).map(cat => {
            const icona = ICONE[cat] || 'contact_mail';
            const elenco = gruppi.get(cat);
            return `
                <section class="ct-gruppo">
                    <header class="ct-gruppo-testa">
                        <span class="material-symbols-rounded" aria-hidden="true">${esc(icona)}</span>
                        <h4 class="ct-gruppo-titolo">${esc(cat)}</h4>
                        <span class="ct-gruppo-contatore">${elenco.length}</span>
                    </header>
                    <div class="ct-griglia">${elenco.map(c => cardHtml(c, icona)).join('')}</div>
                </section>`;
        }).join('');

        for (const card of listBox.querySelectorAll('.ct-card')) {
            card.addEventListener('click', () => {
                const contatto = contatti.find(x => x.id === card.getAttribute('data-id'));
                if (contatto) openModal(contatto);
            });
        }
    }

    async function load() {
        try {
            contatti = await window.electronAPI.anagrafica.contatti.getByPersona({ personaId: persona.id });
            render();
            if (typeof onChange === 'function') onChange(contatti.length);
        } catch (e) {
            listBox.innerHTML = `
                <div class="ak-empty">
                    ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                    <h4>Caricamento non riuscito</h4>
                    <p>${esc(e.message || 'Errore sconosciuto.')}</p>
                </div>`;
        }
    }

    function aggiornaSuggerimenti(categoria) {
        dlTipi.innerHTML = (TIPI_PER_CATEGORIA[categoria] || []).map(t => `<option value="${esc(t)}"></option>`).join('');
        inVal.type = TIPI_VALORE[categoria] || 'text';
    }

    function openModal(contatto = null) {
        mostraErrore(errorBox, '');
        if (contatto) {
            titleText.textContent = 'Modifica Contatto';
            inId.value = contatto.id;
            inCat.value = contatto.categoria || '';
            aggiornaSuggerimenti(contatto.categoria);
            inTipo.value = contatto.tipo || '';
            inVal.value = contatto.valore || '';
            inPrin.checked = contatto.is_principale === 1;
            inNote.value = contatto.note || '';
            btnDelete.hidden = false;
        } else {
            titleText.textContent = 'Nuovo Contatto';
            form.reset();
            inId.value = '';
            inCat.value = '';
            aggiornaSuggerimenti('');
            btnDelete.hidden = true;
        }
        if (procedura) procedura.vaiA(0, { valida: false });
        apriModale(modal);
    }

    async function salva() {
        mostraErrore(errorBox, '');
        try {
            const dati = {
                persona_id: persona.id,
                categoria: inCat.value,
                tipo: inTipo.value.trim(),
                valore: inVal.value.trim(),
                is_principale: inPrin.checked,
                note: inNote.value.trim()
            };
            if (inId.value) {
                dati.id = inId.value;
                await window.electronAPI.anagrafica.contatti.update(dati);
                toast('Contatto aggiornato', 'success');
            } else {
                await window.electronAPI.anagrafica.contatti.create(dati);
                toast('Contatto aggiunto', 'success');
            }
            chiudiModale(modal);
            await load();
        } catch (err) {
            mostraErrore(errorBox, err.message || 'Errore durante il salvataggio.');
        }
    }

    inCat.addEventListener('change', () => {
        aggiornaSuggerimenti(inCat.value);
        inTipo.value = '';
    });
    el.querySelector('#ct-add').addEventListener('click', () => openModal());
    el.querySelector('#ct-close').addEventListener('click', () => chiudiModale(modal));
    modal.addEventListener('click', (evento) => { if (evento.target === modal) chiudiModale(modal); });
    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && modal.dataset.aperta === 'si') chiudiModale(modal);
    });
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!procedura) return;
        const problema = await procedura.concludi();
        if (problema) mostraErrore(errorBox, problema);
    });
    btnDelete.addEventListener('click', async () => {
        if (!(await conferma({ titolo: 'Eliminare questo contatto?', etichetta: 'Elimina', pericolosa: true }))) return;
        try {
            btnDelete.disabled = true;
            await window.electronAPI.anagrafica.contatti.remove({ id: inId.value });
            toast('Contatto eliminato', 'success');
            chiudiModale(modal);
            await load();
        } catch (err) {
            mostraErrore(errorBox, err.message || 'Errore durante l\'eliminazione.');
        } finally {
            btnDelete.disabled = false;
        }
    });

    load();
}
