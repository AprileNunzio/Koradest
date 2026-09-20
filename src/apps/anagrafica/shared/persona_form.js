import { populateProvinceDatalist, populateNazioniDatalist, populateComuniDatalist, getComuniCache } from './riferimenti.js';
import { campoHtml, toISODate, zonaHtml } from './ui_kit.js';

export const STATI_CIVILI = ['Celibe/Nubile', 'Coniugato/a', 'Divorziato/a', 'Vedovo/a', 'Unione civile'];

const P = 'persona-';
const CF_PATTERN = '[A-Za-z]{6}[0-9LMNPQRSTUVlmnpqrstuv]{2}[A-Za-z][0-9LMNPQRSTUVlmnpqrstuv]{2}[A-Za-z][0-9LMNPQRSTUVlmnpqrstuv]{3}[A-Za-z]';

const CAMPI_IDENTITA = [
    { key: 'cognome', label: 'Cognome', icon: 'badge', type: 'text', required: true, maxLength: 80, hint: 'Il cognome come riportato sui documenti.' },
    { key: 'nome', label: 'Nome', icon: 'person', type: 'text', required: true, maxLength: 80, hint: 'Il nome di battesimo.' },
    { key: 'cf', label: 'Codice Fiscale', icon: 'fingerprint', type: 'text', required: true, uppercase: true, full: true, maxLength: 16, pattern: CF_PATTERN, hint: 'Chiave univoca della persona: una volta salvato non è più modificabile.' },
    { key: 'sesso', label: 'Sesso', icon: 'wc', type: 'select', required: true, hint: 'Come indicato sui documenti.', options: [
        { value: 'M', label: 'Maschio' }, { value: 'F', label: 'Femmina' }, { value: 'Altro', label: 'Altro' }
    ] },
    { key: 'stato-civile', label: 'Stato Civile', icon: 'favorite', type: 'select', required: true, hint: 'La situazione familiare attuale.', options: STATI_CIVILI.map(s => ({ value: s, label: s })) }
];

const CAMPI_NASCITA = [
    { key: 'data-nascita', label: 'Data di Nascita', icon: 'cake', type: 'date', required: true, hint: 'Giorno, mese e anno di nascita.' },
    { key: 'luogo-nascita', label: 'Luogo di Nascita', icon: 'location_on', type: 'text', datalist: true, maxLength: 80, hint: 'Comune di nascita: Provincia e CAP arrivano da soli.' },
    { key: 'provincia-nascita', label: 'Provincia', icon: 'map', type: 'text', uppercase: true, datalist: true, maxLength: 2, hint: 'Sigla di due lettere, suggerita in automatico.' },
    { key: 'cap-nascita', label: 'CAP di Nascita', icon: 'markunread_mailbox', type: 'text', datalist: true, maxLength: 5, pattern: '[0-9]{5}', hint: 'Codice postale a cinque cifre.' },
    { key: 'cittadinanza', label: 'Cittadinanza', icon: 'flag', type: 'text', datalist: true, maxLength: 60, hint: 'La nazionalità, ad esempio Italiana.' }
];

const grigliaHtml = (campi) => `<div class="ak-form-grid">${campi.map(f => campoHtml(f, '', P)).join('')}</div>`;

export function personaFormHtml() {
    return `
        <input type="hidden" id="persona-id">
        <div class="k-zone">
            ${zonaHtml({ zona: 'identita', titolo: 'Identità', nota: 'Chi è la persona.', corpo: grigliaHtml(CAMPI_IDENTITA) })}
            ${zonaHtml({ zona: 'nascita', titolo: 'Nascita e cittadinanza', nota: 'Dove e quando è nata.', corpo: grigliaHtml(CAMPI_NASCITA) })}
        </div>
    `;
}

export function passiPersona() {
    return [
        {
            id: 'identita',
            zona: 'identita',
            etichetta: 'Identità',
            titolo: 'Identità della persona',
            nota: 'Cognome, nome e codice fiscale sono obbligatori.',
            corpo: `<input type="hidden" id="persona-id">${grigliaHtml(CAMPI_IDENTITA)}`
        },
        {
            id: 'nascita',
            zona: 'nascita',
            etichetta: 'Nascita',
            titolo: 'Nascita e cittadinanza',
            nota: 'Scrivendo il comune, Provincia e CAP vengono suggeriti.',
            corpo: grigliaHtml(CAMPI_NASCITA)
        }
    ];
}

export function readPersonaForm(el) {
    const valore = (selettore) => {
        const campo = el.querySelector(selettore);
        return campo ? campo.value.trim() : '';
    };
    return {
        cognome: valore('#persona-cognome'),
        nome: valore('#persona-nome'),
        codice_fiscale: valore('#persona-cf').toUpperCase(),
        sesso: valore('#persona-sesso'),
        data_nascita: valore('#persona-data-nascita'),
        luogo_nascita: valore('#persona-luogo-nascita'),
        provincia_nascita: valore('#persona-provincia-nascita').toUpperCase(),
        cap_nascita: valore('#persona-cap-nascita'),
        cittadinanza: valore('#persona-cittadinanza'),
        stato_civile: valore('#persona-stato-civile')
    };
}

export function populatePersonaFormDatalists(el) {
    populateProvinceDatalist(el.querySelector('#dl-provincia-nascita'));
    populateNazioniDatalist(el.querySelector('#dl-cittadinanza'));
    populateComuniDatalist(el.querySelector('#dl-luogo-nascita'));
    const inputLuogoNascita = el.querySelector('#persona-luogo-nascita');
    if (!inputLuogoNascita) return;
    inputLuogoNascita.addEventListener('input', () => {
        const cache = getComuniCache();
        const cercato = inputLuogoNascita.value.trim().toLowerCase();
        const comune = cache.find(c => c.n.toLowerCase() === cercato);
        if (!comune) return;
        const provincia = el.querySelector('#persona-provincia-nascita');
        if (provincia) provincia.value = comune.p;
        const cap = el.querySelector('#persona-cap-nascita');
        if (cap) cap.value = comune.c;
    });
}

export function fillPersonaForm(el, persona) {
    const scrivi = (selettore, valore) => {
        const campo = el.querySelector(selettore);
        if (campo) campo.value = valore == null ? '' : valore;
    };
    scrivi('#persona-id', persona ? persona.id : '');
    scrivi('#persona-cognome', persona ? persona.cognome : '');
    scrivi('#persona-nome', persona ? persona.nome : '');
    scrivi('#persona-sesso', persona ? persona.sesso : '');
    scrivi('#persona-data-nascita', persona ? toISODate(persona.data_nascita) : '');
    scrivi('#persona-luogo-nascita', persona ? persona.luogo_nascita : '');
    scrivi('#persona-provincia-nascita', persona ? persona.provincia_nascita : '');
    scrivi('#persona-cap-nascita', persona ? persona.cap_nascita : '');
    scrivi('#persona-cittadinanza', persona ? persona.cittadinanza : '');
    scrivi('#persona-stato-civile', persona ? persona.stato_civile : '');
    const cfInput = el.querySelector('#persona-cf');
    if (!cfInput) return;
    cfInput.value = persona ? persona.codice_fiscale : '';
    cfInput.disabled = Boolean(persona);
    cfInput.title = persona ? 'Il Codice Fiscale è la chiave univoca della persona e non può essere modificato' : '';
}
