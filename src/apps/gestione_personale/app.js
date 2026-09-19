import { toast, fmt, conferma } from '../../js/utils.js';
import { esc } from '../../js/shared/html.js';
import { icona3d, ZONE } from '../../js/shared/tinte.js';
import { creaProcedura } from '../../js/shared/procedura.js';
import { isValidCodiceFiscale } from './shared/validators.js';
import { heroHtml, guidaHtml, apriModale, chiudiModale, mostraErrore } from './shared/ui_kit.js';
import { passiPersona, personaFormHtml, readPersonaForm, fillPersonaForm, populatePersonaFormDatalists } from './shared/persona_form.js';
import { renderPersonScopedCrudSubapp } from './shared/subapp_crud_kit.js';
import { mountContattiSection } from './shared/contatti_section.js';
import { mountAuditButton } from './shared/audit_trail_button.js';

const TIPI_DOCUMENTO = {
    carta_identita: "Carta d'Identità", passaporto: 'Passaporto', patente: 'Patente di Guida',
    tessera_sanitaria: 'Tessera Sanitaria', permesso_soggiorno: 'Permesso di Soggiorno', altro: 'Altro'
};
const TIPI_CONTRATTO = ['Tempo Indeterminato', 'Tempo Determinato', 'Apprendistato', 'Partita IVA', 'Collaborazione', 'Stage/Tirocinio', 'Altro'];
const MANSIONI_SCOLASTICHE = ['Docente', 'Assistente Tecnico', 'Collaboratore Scolastico', 'Assistente Amministrativo', 'DSGA', 'Altro'];
const TIPI_INDIRIZZO = { residenza: 'Residenza', domicilio: 'Domicilio' };
const TIPI_TITOLO = ['Licenza Media', 'Diploma di Qualifica', 'Diploma di Maturità', 'Laurea Triennale', 'Laurea Magistrale', 'Laurea Vecchio Ordinamento', 'Master', 'Dottorato', 'Abilitazione', 'Altro'];

function scadenzaInfo(r) {
    if (!r.data_scadenza) return { label: 'Nessuna scadenza registrata', badge: null };
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const giorni = Math.ceil((new Date(r.data_scadenza) - oggi) / 86400000);
    if (giorni < 0) return { label: `Scaduto il ${fmt.data(r.data_scadenza)}`, badge: 'Scaduto' };
    if (giorni <= 60) return { label: `In scadenza: ${fmt.data(r.data_scadenza)}`, badge: 'In scadenza' };
    return { label: `Valido fino al ${fmt.data(r.data_scadenza)}`, badge: null };
}

function periodoLavoro(r) {
    const inizio = r.data_inizio ? fmt.data(r.data_inizio) : '—';
    if (r.is_corrente) return `Dal ${inizio} · in corso`;
    return `Dal ${inizio}${r.data_fine ? ' al ' + fmt.data(r.data_fine) : ''}`;
}

function periodoIndirizzo(r) {
    const inizio = r.data_inizio ? fmt.data(r.data_inizio) : null;
    if (r.is_corrente) return inizio ? `Dal ${inizio} · attuale` : 'Indirizzo attuale';
    if (inizio) return `Dal ${inizio}${r.data_fine ? ' al ' + fmt.data(r.data_fine) : ''}`;
    return r.data_fine ? `Fino al ${fmt.data(r.data_fine)}` : '';
}

function documentiConfig(persona, onChange) {
    return {
        embedded: true, fixedPersona: persona, tone: 'orange', newLabel: 'Nuovo Documento',
        recordsTitle: 'Documenti', tableName: 'documenti_identita', onChange,
        emptyLabel: "Registra carta d'identità, passaporto, patente e altri documenti di questa persona.",
        instructions: { intro: 'Documenti di riconoscimento e relative scadenze: i documenti scaduti o in scadenza entro 60 giorni vengono evidenziati.', steps: [
            'Premi <strong>“Nuovo Documento”</strong>.', 'Scegli il <strong>tipo</strong> e inserisci il <strong>numero</strong>.', 'Indica ente di rilascio e date, poi salva.'
        ] },
        modalHint: 'Numero e date si trovano stampati sul documento. La scadenza è facoltativa ma consigliata per gli avvisi.',
        api: window.electronAPI.anagrafica.documenti,
        fields: [
            { key: 'tipo', label: 'Tipo Documento', icon: 'badge', type: 'select', required: true, gruppo: 'documento', gruppoIcona: 'contact_page', gruppoEtichetta: 'Documento', gruppoNota: 'Che documento è e come si identifica.', options: Object.entries(TIPI_DOCUMENTO).map(([value, label]) => ({ value, label })), hint: 'Che tipo di documento.' },
            { key: 'numero', label: 'Numero Documento', icon: 'tag', type: 'text', gruppo: 'documento', maxLength: 40, hint: 'Codice alfanumerico del documento.' },
            { key: 'ente_rilascio', label: 'Ente di Rilascio', icon: 'account_balance', type: 'text', gruppo: 'documento', span: 2, datalist: { table: 'documenti_identita', column: 'ente_rilascio' }, hint: 'Chi lo ha emesso: Comune, Questura, Motorizzazione.' },
            { key: 'data_rilascio', label: 'Data di Rilascio', icon: 'event', type: 'date', gruppo: 'validita', gruppoIcona: 'event_available', gruppoEtichetta: 'Validità', gruppoNota: 'Da quando vale e fino a quando.', hint: 'Quando è stato emesso.' },
            { key: 'data_scadenza', label: 'Data di Scadenza', icon: 'event_busy', type: 'date', gruppo: 'validita', hint: 'Utile per gli avvisi automatici.' }
        ],
        cardTitle: (r) => `${TIPI_DOCUMENTO[r.tipo] || r.tipo}${r.numero ? ' — ' + r.numero : ''}`,
        cardSubtitle: (r) => (r.ente_rilascio ? `Rilasciato da ${r.ente_rilascio}` : ''),
        cardMeta: (r) => scadenzaInfo(r).label,
        cardBadge: (r) => scadenzaInfo(r).badge
    };
}

function lavoroConfig(persona, onChange) {
    return {
        embedded: true, fixedPersona: persona, tone: 'teal', newLabel: 'Nuovo Rapporto',
        recordsTitle: 'Rapporti di lavoro', tableName: 'rapporti_lavoro', onChange,
        emptyLabel: 'Aggiungi impiego attuale e rapporti passati per costruire lo storico professionale.',
        instructions: { intro: 'Rapporti di lavoro attuali e passati della persona.', steps: [
            'Premi <strong>“Nuovo Rapporto”</strong>.', 'Inserisci datore e mansione.', 'Se in corso, lascia spuntato “È il lavoro attuale”; altrimenti aggiungi la data di fine.'
        ] },
        modalHint: 'Per un lavoro in corso lascia vuota la data di fine e mantieni la spunta “attuale”.',
        api: window.electronAPI.anagrafica.lavoro,
        fields: [
            { key: 'datore_lavoro', label: 'Datore di Lavoro', icon: 'apartment', type: 'text', span: 2, required: true, gruppo: 'incarico', gruppoIcona: 'apartment', gruppoEtichetta: 'Incarico', gruppoNota: 'Chi è il datore e che ruolo si ricopre.', datalist: { table: 'rapporti_lavoro', column: 'datore_lavoro' }, hint: "Nome dell'azienda o del datore." },
            { key: 'mansione', label: 'Mansione', icon: 'engineering', type: 'select', gruppo: 'incarico', options: MANSIONI_SCOLASTICHE.map(v => ({ value: v, label: v })), hint: 'Profilo o ruolo ricoperto.' },
            { key: 'tipo_contratto', label: 'Tipo Contratto', icon: 'description', type: 'select', gruppo: 'incarico', options: TIPI_CONTRATTO.map(v => ({ value: v, label: v })), hint: 'Forma contrattuale.' },
            { key: 'sede_lavoro', label: 'Sede di Lavoro', icon: 'location_on', type: 'text', span: 2, gruppo: 'incarico', datalist: { table: 'rapporti_lavoro', column: 'sede_lavoro' }, hint: 'Città o luogo di lavoro.' },
            { key: 'data_inizio', label: 'Data Inizio', icon: 'event', type: 'date', gruppo: 'periodo', gruppoIcona: 'calendar_month', gruppoEtichetta: 'Periodo', gruppoNota: 'Quanto è durato, o se è ancora in corso.', hint: 'Inizio del rapporto.' },
            { key: 'data_fine', label: 'Data Fine', icon: 'event_busy', type: 'date', gruppo: 'periodo', hint: 'Vuoto se ancora in corso.' },
            { key: 'is_corrente', label: 'È il lavoro attuale', type: 'checkbox', default: 1, full: true, gruppo: 'periodo', hint: 'Attivo se il rapporto è tuttora in corso.' }
        ],
        cardTitle: (r) => r.datore_lavoro,
        cardSubtitle: (r) => [r.mansione, r.tipo_contratto].filter(Boolean).join(' · '),
        cardMeta: (r) => periodoLavoro(r),
        cardBadge: (r) => (r.is_corrente ? 'Attuale' : null)
    };
}

function titoliConfig(persona, onChange) {
    return {
        embedded: true, fixedPersona: persona, tone: 'cobalt', newLabel: 'Nuovo Titolo',
        recordsTitle: 'Titoli di studio', tableName: 'titoli_studio', onChange,
        emptyLabel: 'Aggiungi i titoli di studio: servono per la presa di servizio e per le pratiche.',
        instructions: { intro: 'Titoli di studio e qualifiche della persona.', steps: [
            'Premi <strong>“Nuovo Titolo”</strong>.', 'Inserisci denominazione, tipo e votazione.', 'Indica istituto, città e data di conseguimento.'
        ] },
        api: window.electronAPI.anagrafica.titoliStudio,
        fields: [
            { key: 'denominazione', label: 'Denominazione Titolo', icon: 'workspace_premium', type: 'text', span: 2, required: true, gruppo: 'titolo', gruppoIcona: 'workspace_premium', gruppoEtichetta: 'Titolo', gruppoNota: 'Come si chiama e quanto vale.', datalist: { table: 'titoli_studio', column: 'denominazione' }, hint: 'Ad esempio Diploma di Ragioniere.' },
            { key: 'tipo', label: 'Tipo di Titolo', icon: 'category', type: 'select', gruppo: 'titolo', options: TIPI_TITOLO.map(v => ({ value: v, label: v })), hint: 'Livello del titolo.' },
            { key: 'votazione', label: 'Votazione', icon: 'grade', type: 'text', gruppo: 'titolo', maxLength: 20, datalist: { table: 'titoli_studio', column: 'votazione' }, hint: 'Ad esempio 100/100.' },
            { key: 'istituto_rilascio', label: 'Istituto / Università', icon: 'account_balance', type: 'text', span: 2, gruppo: 'istituto', gruppoIcona: 'account_balance', gruppoEtichetta: 'Istituto', gruppoNota: 'Chi lo ha rilasciato e quando.', datalist: { table: 'titoli_studio', column: 'istituto_rilascio' }, hint: 'Ente che ha rilasciato il titolo.' },
            { key: 'citta_istituto', label: 'Città Istituto', icon: 'location_city', type: 'text', gruppo: 'istituto', datalist: { table: 'titoli_studio', column: 'citta_istituto' }, hint: "Città dell'istituto." },
            { key: 'data_conseguimento', label: 'Data Conseguimento', icon: 'event', type: 'date', gruppo: 'istituto', hint: 'Quando è stato conseguito.' },
            { key: 'is_principale', label: 'Titolo principale', type: 'checkbox', default: 0, full: true, gruppo: 'istituto', hint: 'Da usare come predefinito nelle pratiche.' }
        ],
        cardTitle: (r) => r.denominazione,
        cardSubtitle: (r) => [r.tipo, r.votazione].filter(Boolean).join(' · '),
        cardMeta: (r) => [r.istituto_rilascio, r.data_conseguimento ? fmt.data(r.data_conseguimento) : ''].filter(Boolean).join(' · '),
        cardBadge: (r) => (r.is_principale ? 'Principale' : null)
    };
}

function bancariConfig(persona, onChange) {
    return {
        embedded: true, fixedPersona: persona, tone: 'green', newLabel: 'Nuovo Conto',
        recordsTitle: 'Dati bancari', tableName: 'dati_bancari', onChange,
        emptyLabel: 'Aggiungi le coordinate bancarie su cui ricevere gli accrediti.',
        instructions: { intro: 'Coordinate bancarie su cui ricevere gli accrediti.', steps: [
            'Premi <strong>“Nuovo Conto”</strong>.', "Inserisci l'IBAN completo.", 'Indica banca e intestatario.'
        ] },
        modalHint: "Controlla che l'IBAN sia corretto: in Italia sono 27 caratteri (IT più 25).",
        api: window.electronAPI.anagrafica.datiBancari,
        fields: [
            { key: 'iban', label: 'IBAN', icon: 'tag', type: 'text', span: 2, required: true, uppercase: true, maxLength: 34, pattern: '[A-Za-z]{2}[0-9]{2}[A-Za-z0-9]{11,30}', hint: 'Coordinata bancaria internazionale.' },
            { key: 'banca', label: 'Banca / Posta', icon: 'account_balance', type: 'text', datalist: { table: 'dati_bancari', column: 'banca' }, hint: 'Istituto che tiene il conto.' },
            { key: 'intestatario', label: 'Intestatario', icon: 'person', type: 'text', datalist: { table: 'dati_bancari', column: 'intestatario' }, hint: 'A chi è intestato il conto.' },
            { key: 'is_principale', label: 'Conto principale', type: 'checkbox', default: 0, full: true, hint: 'Da usare come predefinito per gli accrediti.' }
        ],
        cardTitle: (r) => r.banca || 'Conto bancario',
        cardSubtitle: (r) => r.iban || '',
        cardMeta: (r) => (r.intestatario ? `Intestato a ${r.intestatario}` : ''),
        cardBadge: (r) => (r.is_principale ? 'Principale' : null)
    };
}

function residenzaConfig(persona, onChange) {
    return {
        embedded: true, fixedPersona: persona, tone: 'rust', newLabel: 'Nuovo Indirizzo',
        recordsTitle: 'Indirizzi', tableName: 'indirizzi', onChange,
        emptyLabel: 'Aggiungi residenza attuale, domicilio ed eventuali indirizzi passati.',
        instructions: { intro: "<strong>Residenza</strong>: indirizzo ufficiale all'anagrafe. <strong>Domicilio</strong>: dove la persona vive, se diverso.", steps: [
            'Premi <strong>“Nuovo Indirizzo”</strong>.', 'Scegli il tipo tra Residenza e Domicilio.', 'Scrivi il <strong>Comune</strong>: Provincia e CAP si compilano da soli.'
        ] },
        modalHint: 'Inizia dal Comune: Provincia e CAP si compilano automaticamente. Togli la spunta “attuale” per archiviare un vecchio indirizzo.',
        api: window.electronAPI.anagrafica.residenza,
        fields: [
            { key: 'tipo', label: 'Tipo Indirizzo', icon: 'home', type: 'select', required: true, gruppo: 'via', gruppoIcona: 'signpost', gruppoEtichetta: 'Indirizzo', gruppoNota: 'Che indirizzo è e dove si trova la porta.', options: Object.entries(TIPI_INDIRIZZO).map(([value, label]) => ({ value, label })), hint: 'Residenza ufficiale oppure Domicilio.' },
            { key: 'via', label: 'Via / Piazza', icon: 'signpost', type: 'text', span: 2, required: true, gruppo: 'via', datalist: { table: 'indirizzi', column: 'via' }, hint: 'Nome della via o della piazza.' },
            { key: 'civico', label: 'Civico', icon: 'tag', type: 'text', gruppo: 'via', maxLength: 10, hint: 'Numero civico.' },
            { key: 'comune', label: 'Comune', icon: 'location_city', type: 'text', required: true, gruppo: 'luogo', gruppoIcona: 'location_city', gruppoEtichetta: 'Luogo', gruppoNota: 'Scrivi il comune: Provincia e CAP arrivano da soli.', datalist: 'comuni', hint: 'Compila Provincia e CAP.' },
            { key: 'provincia', label: 'Provincia', icon: 'map', type: 'text', uppercase: true, gruppo: 'luogo', maxLength: 2, datalist: 'province', hint: 'Sigla di due lettere, suggerita in automatico.' },
            { key: 'cap', label: 'CAP', icon: 'markunread_mailbox', type: 'text', gruppo: 'luogo', maxLength: 5, pattern: '[0-9]{5}', datalist: { table: 'indirizzi', column: 'cap' }, hint: 'Codice postale a cinque cifre.' },
            { key: 'stato', label: 'Stato', icon: 'flag', type: 'text', default: 'Italia', gruppo: 'luogo', datalist: { table: 'indirizzi', column: 'stato' }, hint: 'Nazione.' },
            { key: 'data_inizio', label: 'Data Inizio', icon: 'event', type: 'date', gruppo: 'periodo', gruppoIcona: 'calendar_month', gruppoEtichetta: 'Periodo', gruppoNota: 'Da quando vale questo indirizzo.', hint: 'Da quando.' },
            { key: 'data_fine', label: 'Data Fine', icon: 'event_busy', type: 'date', gruppo: 'periodo', hint: 'Vuoto se è quello attuale.' },
            { key: 'is_corrente', label: "È l'indirizzo attuale", type: 'checkbox', default: 1, full: true, gruppo: 'periodo', hint: 'Attivo se la persona vive qui adesso.' }
        ],
        cardTitle: (r) => `${TIPI_INDIRIZZO[r.tipo] || r.tipo}`,
        cardSubtitle: (r) => `${[r.via, r.civico].filter(Boolean).join(' ')}${r.via ? ',' : ''} ${r.cap || ''} ${r.comune || ''}${r.provincia ? ' (' + r.provincia + ')' : ''}`.trim(),
        cardMeta: (r) => periodoIndirizzo(r),
        cardBadge: (r) => (r.is_corrente ? 'Attuale' : null)
    };
}

function famigliaConfig(persona, onChange) {
    return {
        embedded: true, fixedPersona: persona, tone: 'pink', newLabel: 'Nuovo Familiare',
        recordsTitle: 'Componenti della famiglia', tableName: 'familiari', onChange,
        emptyLabel: 'Aggiungi coniugi, figli e altri familiari a carico o per i riferimenti di emergenza.',
        instructions: { intro: 'Nucleo familiare e parenti della persona.', steps: [
            'Premi <strong>“Nuovo Familiare”</strong>.', 'Inserisci i dati essenziali e il grado di parentela.', 'Spunta “A carico” se necessario ai fini fiscali.'
        ] },
        modalHint: 'Puoi aggiungere familiari anche se non hanno una scheda in anagrafica.',
        api: window.electronAPI.familiari || window.electronAPI.anagrafica.familiari,
        fields: [
            { key: 'nome', label: 'Nome', icon: 'person', type: 'text', required: true, gruppo: 'persona', gruppoIcona: 'person', gruppoEtichetta: 'Persona', gruppoNota: 'Chi è il familiare.', maxLength: 80 },
            { key: 'cognome', label: 'Cognome', icon: 'badge', type: 'text', required: true, gruppo: 'persona', maxLength: 80 },
            { key: 'codice_fiscale', label: 'Codice Fiscale', icon: 'fingerprint', type: 'text', uppercase: true, span: 2, gruppo: 'persona', maxLength: 16 },
            { key: 'sesso', label: 'Sesso', icon: 'wc', type: 'select', gruppo: 'persona', options: [
                { value: 'M', label: 'Maschio' }, { value: 'F', label: 'Femmina' }, { value: 'Altro', label: 'Altro' }
            ] },
            { key: 'data_nascita', label: 'Data di Nascita', icon: 'cake', type: 'date', gruppo: 'persona' },
            { key: 'grado_parentela', label: 'Grado di Parentela', icon: 'diversity_1', type: 'select', required: true, gruppo: 'legame', gruppoIcona: 'diversity_1', gruppoEtichetta: 'Legame', gruppoNota: 'Che rapporto ha con la persona.', options: [
                { value: 'Coniuge', label: 'Coniuge' }, { value: 'Figlio/a', label: 'Figlio/a' },
                { value: 'Genitore', label: 'Genitore' }, { value: 'Fratello/Sorella', label: 'Fratello/Sorella' }, { value: 'Altro', label: 'Altro' }
            ] },
            { key: 'is_a_carico', label: 'Familiare a carico', icon: 'payments', type: 'checkbox', full: true, gruppo: 'legame', hint: 'Ai fini fiscali.' }
        ],
        cardTitle: (r) => `${r.nome} ${r.cognome}`,
        cardSubtitle: (r) => r.codice_fiscale || '',
        cardMeta: (r) => `${r.grado_parentela}${r.data_nascita ? ' · nato il ' + fmt.data(r.data_nascita) : ''}`,
        cardBadge: (r) => (r.is_a_carico ? 'A carico' : null)
    };
}

const SCHEDE = [
    { id: 'dati', zona: 'identita', etichetta: 'Dati' },
    { id: 'contatti', zona: 'contatti', etichetta: 'Contatti' },
    { id: 'famiglia', zona: 'famiglia', etichetta: 'Famiglia' },
    { id: 'documenti', zona: 'documenti', etichetta: 'Documenti' },
    { id: 'lavoro', zona: 'lavoro', etichetta: 'Lavoro' },
    { id: 'titoli', zona: 'titoli', etichetta: 'Titoli' },
    { id: 'bancari', zona: 'bancari', etichetta: 'Banca' },
    { id: 'residenza', zona: 'residenza', etichetta: 'Residenza' }
];

const modalePersonaHtml = (titolo) => `
    <div id="persona-modal" class="ak-modal" data-aperta="no" data-zona="identita" role="dialog" aria-modal="true" aria-labelledby="persona-modal-title">
        <div class="ak-modal-card">
            <div class="ak-modal-head">
                <h3 id="persona-modal-title"><span class="material-symbols-rounded">badge</span><span id="persona-modal-title-text">${esc(titolo)}</span></h3>
                <button type="button" id="persona-modal-close" class="ak-iconbtn" aria-label="Chiudi finestra"><span class="material-symbols-rounded">close</span></button>
            </div>
            <div class="ak-modal-body">
                <div class="ak-modal-hint">
                    <span class="material-symbols-rounded">lightbulb</span>
                    <span>Il Codice Fiscale è la chiave univoca della persona: una volta creata non è più modificabile.</span>
                </div>
                <form id="persona-form" class="ak-form" novalidate>
                    <div id="persona-passi"></div>
                    <div id="persona-modal-error" class="ak-error" data-visibile="no" role="alert"></div>
                </form>
            </div>
        </div>
    </div>
`;

export default {
    render: async (el, params = {}) => {
        let rawPersone = [];

        const renderDirectory = async (filtro = '') => {
            el.innerHTML = `
                <div class="k-schermo fade-in-up" data-zona="lavoro">
                    <div class="k-schermo-testa">
                        ${heroHtml({
                            title: 'Gestione del Personale',
                            tone: 'teal',
                            icon: 'groups',
                            subtitle: 'Scegli una persona per gestirne tutti i dati in un unico posto.',
                            actionsHtml: '<button type="button" id="gp-add-persona" class="ak-hero-btn"><span class="material-symbols-rounded">person_add</span>Nuova Persona</button>'
                        })}
                        ${guidaHtml({
                            tone: 'teal',
                            intro: "Da qui gestisci l'anagrafica del personale. Cerca o scegli una persona: si apre la sua scheda con dati, contatti, documenti, lavoro e indirizzi, tutti modificabili in un'unica schermata.",
                            steps: [
                                'Usa la ricerca per nome, cognome o codice fiscale.',
                                'Premi su una persona per aprire la sua scheda completa.',
                                'Oppure premi <strong>“Nuova Persona”</strong> per inserirne una nuova.'
                            ]
                        })}
                    </div>
                    <div class="k-schermo-corpo k-schermo-corpo--fisso">
                        <div class="ak-panel">
                            <div class="ak-toolbar">
                                <label class="k-cerca" style="flex: 1 1 18rem;">
                                    <span class="material-symbols-rounded">search</span>
                                    <input type="search" id="gp-search" placeholder="Cerca per nome, cognome o codice fiscale…" value="${esc(filtro)}" aria-label="Cerca persona">
                                </label>
                                <span class="ak-count" id="gp-count">0</span>
                            </div>
                            <div class="ak-panel-body" id="gp-directory">
                                <div class="k-loading"><div class="k-spinner"></div><span>Caricamento del personale…</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                ${modalePersonaHtml('Nuova Persona')}
            `;

            const directory = el.querySelector('#gp-directory');
            const ricerca = el.querySelector('#gp-search');
            const contatore = el.querySelector('#gp-count');
            const modale = el.querySelector('#persona-modal');
            const form = el.querySelector('#persona-form');
            const erroreBox = el.querySelector('#persona-modal-error');
            let procedura = null;

            const disegna = (testo) => {
                const cercato = (testo || '').toLowerCase();
                const trovate = rawPersone.filter(p =>
                    (p.nome || '').toLowerCase().includes(cercato) ||
                    (p.cognome || '').toLowerCase().includes(cercato) ||
                    (p.codice_fiscale || '').toLowerCase().includes(cercato));
                contatore.textContent = String(trovate.length);
                if (trovate.length === 0) {
                    directory.innerHTML = `
                        <div class="ak-empty">
                            ${icona3d('person_search', { dimensione: 'lg', varianti: ['tenue'] })}
                            <h4>Nessuna persona trovata</h4>
                            <p>Modifica la ricerca oppure crea una nuova persona.</p>
                        </div>`;
                    return;
                }
                directory.innerHTML = `<div class="ak-persone">${trovate.map(p => `
                    <button type="button" class="ak-persona fade-in-up" data-id="${esc(p.id)}" data-bloccata="${p.is_deleted ? 'si' : 'no'}">
                        ${icona3d('person', { dimensione: 'sm', varianti: ['reattiva'] })}
                        <span class="ak-persona-corpo">
                            <span class="ak-persona-nome">${esc(`${p.cognome || ''} ${p.nome || ''}`.trim() || 'Senza nome')}</span>
                            <span class="ak-persona-cf">${esc(p.codice_fiscale || 'CF non specificato')}</span>
                            <span class="ak-persona-nota">${p.is_deleted ? 'Bloccata' : (p.data_nascita ? `Nato il ${esc(fmt.data(p.data_nascita))}` : '')}</span>
                        </span>
                        <span class="material-symbols-rounded ak-persona-freccia" aria-hidden="true">chevron_right</span>
                    </button>`).join('')}</div>`;
                for (const card of directory.querySelectorAll('.ak-persona')) {
                    card.addEventListener('click', () => openWorkspace(card.getAttribute('data-id')));
                }
            };

            const carica = async (testo = '') => {
                try {
                    rawPersone = await window.electronAPI.anagrafica.persone.getAll({ includeDeleted: true });
                    disegna(testo);
                } catch (e) {
                    directory.innerHTML = `
                        <div class="ak-empty">
                            ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                            <h4>Caricamento non riuscito</h4>
                            <p>${esc(e.message || 'Errore sconosciuto.')}</p>
                        </div>`;
                }
            };

            ricerca.addEventListener('input', () => disegna(ricerca.value));

            const salva = async () => {
                mostraErrore(erroreBox, '');
                try {
                    const dati = readPersonaForm(modale);
                    if (!dati.codice_fiscale || !isValidCodiceFiscale(dati.codice_fiscale)) {
                        throw new Error('Il Codice Fiscale è obbligatorio e deve essere valido: è la chiave univoca della persona.');
                    }
                    const creata = await window.electronAPI.anagrafica.persone.create(dati);
                    toast('Persona creata con successo', 'success');
                    chiudiModale(modale);
                    if (creata && creata.id) openWorkspace(creata.id);
                    else await carica(ricerca.value);
                } catch (err) {
                    mostraErrore(erroreBox, err.message || 'Errore durante il salvataggio.');
                }
            };

            el.querySelector('#gp-add-persona').addEventListener('click', () => {
                mostraErrore(erroreBox, '');
                procedura = creaProcedura(el.querySelector('#persona-passi'), {
                    id: 'persona',
                    passi: passiPersona(),
                    etichettaFine: 'Crea Persona',
                    iconaFine: 'person_add',
                    etichettaAnnulla: 'Annulla',
                    onAnnulla: () => chiudiModale(modale),
                    onValida: (idPasso, scena) => {
                        if (idPasso !== 'identita') return null;
                        const cf = scena.querySelector('#persona-cf');
                        if (!cf || cf.disabled) return null;
                        if (!isValidCodiceFiscale(cf.value.trim().toUpperCase())) {
                            cf.setAttribute('aria-invalid', 'true');
                            cf.focus();
                            return 'Il Codice Fiscale non è valido: è la chiave univoca della persona.';
                        }
                        return null;
                    },
                    onFine: salva
                });
                fillPersonaForm(modale, null);
                populatePersonaFormDatalists(modale);
                apriModale(modale);
            });
            el.querySelector('#persona-modal-close').addEventListener('click', () => chiudiModale(modale));
            modale.addEventListener('click', (evento) => { if (evento.target === modale) chiudiModale(modale); });
            form.addEventListener('submit', async (evento) => {
                evento.preventDefault();
                if (!procedura) return;
                const problema = await procedura.concludi();
                if (problema) mostraErrore(erroreBox, problema);
            });

            await carica(filtro);
        };

        const openWorkspace = async (personaId) => {
            el.innerHTML = '<div class="k-loading" data-radice-app><div class="k-spinner" style="--k-spinner-size: 2rem;"></div><span>Apertura della scheda…</span></div>';

            let scheda;
            let contattiCount = 0;
            try {
                scheda = await window.electronAPI.anagrafica.persone.getScheda({ id: personaId });
                try {
                    const contatti = await window.electronAPI.anagrafica.contatti.getByPersona({ personaId });
                    contattiCount = Array.isArray(contatti) ? contatti.length : 0;
                } catch (e) {
                    console.warn('[GestionePersonale] Conteggio dei contatti non disponibile:', e);
                }
            } catch (e) {
                el.innerHTML = `
                    <div class="k-schermo">
                        <div class="ak-empty">
                            ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                            <h4>Scheda non disponibile</h4>
                            <p>${esc(e.message || 'Errore sconosciuto.')}</p>
                        </div>
                    </div>`;
                return;
            }

            const p = scheda.persona;
            const conteggi = {
                contatti: contattiCount,
                documenti: scheda.documenti.length,
                lavoro: scheda.rapportiLavoro.length,
                residenza: scheda.indirizzi.length,
                famiglia: scheda.familiari ? scheda.familiari.length : 0,
                titoli: scheda.titoliStudio ? scheda.titoliStudio.length : 0,
                bancari: scheda.datiBancari ? scheda.datiBancari.length : 0
            };

            el.innerHTML = `
                <div class="k-schermo fade-in-up k-schermo--compatto" data-zona="identita">
                    <div class="k-schermo-testa">
                        ${heroHtml({
                            title: `${p.cognome || ''} ${p.nome || ''}`.trim() || 'Persona',
                            subtitle: p.codice_fiscale || 'Codice Fiscale non specificato',
                            icon: 'person',
                            tone: 'teal',
                            auditMountId: 'gp-audit',
                            actionsHtml: `
                                ${p.is_deleted ? '<span class="ak-hero-flag">Bloccata</span>' : ''}
                                ${p.is_deleted
                                    ? '<button type="button" id="gp-restore" class="ak-hero-btn"><span class="material-symbols-rounded">restore</span>Ripristina</button>'
                                    : '<button type="button" id="gp-block" class="ak-hero-btn ak-hero-btn--neutro"><span class="material-symbols-rounded">block</span>Blocca</button>'}
                                <button type="button" id="gp-back" class="ak-hero-btn ak-hero-btn--neutro"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>`
                        })}
                        <div class="ak-schede" role="tablist" aria-label="Sezioni della persona">
                            ${SCHEDE.map((s, i) => `
                                <button type="button" class="ak-scheda" data-scheda="${s.id}" data-zona="${s.zona}" role="tab" aria-selected="${i === 0}">
                                    ${icona3d(ZONE[s.zona].icona, { dimensione: 'xs', varianti: ['reattiva'] })}
                                    <span>${esc(s.etichetta)}</span>
                                    ${s.id === 'dati' ? '' : `<span class="ak-scheda-contatore" id="gp-tc-${s.id}">${conteggi[s.id]}</span>`}
                                </button>`).join('')}
                        </div>
                    </div>
                    <div class="k-schermo-corpo k-schermo-corpo--fisso" id="gp-tab-content"></div>
                </div>
            `;

            mountAuditButton(el.querySelector('#gp-audit'), { tableName: 'persone', recordId: personaId, label: `${p.cognome} ${p.nome}` });
            el.querySelector('#gp-back').addEventListener('click', () => renderDirectory());

            const bloccaBtn = el.querySelector('#gp-block');
            if (bloccaBtn) bloccaBtn.addEventListener('click', async () => {
                if (!(await conferma({ titolo: 'Bloccare questa persona?', testo: 'Potrai ripristinarla in qualsiasi momento.', etichetta: 'Blocca', pericolosa: true }))) return;
                try {
                    await window.electronAPI.anagrafica.persone.remove({ id: personaId });
                    toast('Persona bloccata', 'success');
                    openWorkspace(personaId);
                } catch (e) {
                    toast(e.message || 'Operazione non riuscita', 'error');
                }
            });

            const ripristinaBtn = el.querySelector('#gp-restore');
            if (ripristinaBtn) ripristinaBtn.addEventListener('click', async () => {
                try {
                    await window.electronAPI.anagrafica.persone.restore({ id: personaId });
                    toast('Persona ripristinata', 'success');
                    openWorkspace(personaId);
                } catch (e) {
                    toast(e.message || 'Operazione non riuscita', 'error');
                }
            });

            const contenuto = el.querySelector('#gp-tab-content');
            const aggiornaConteggio = (idScheda, quanti) => {
                const badge = el.querySelector(`#gp-tc-${idScheda}`);
                if (badge) badge.textContent = String(quanti);
            };

            const mountDati = () => {
                contenuto.innerHTML = `
                    <div class="ak-panel" data-zona="identita">
                        <div class="ak-panel-body">
                            <form id="gp-dati-form" class="ak-form">
                                ${personaFormHtml()}
                                <div id="gp-dati-error" class="ak-error" data-visibile="no" role="alert"></div>
                                <div class="ak-actions">
                                    <button type="submit" class="ak-btn ak-btn-primary" id="gp-dati-save"><span class="material-symbols-rounded">save</span>Salva Modifiche</button>
                                </div>
                            </form>
                        </div>
                    </div>`;
                const form = contenuto.querySelector('#gp-dati-form');
                const erroreBox = contenuto.querySelector('#gp-dati-error');
                fillPersonaForm(contenuto, p);
                populatePersonaFormDatalists(contenuto);
                form.addEventListener('submit', async (evento) => {
                    evento.preventDefault();
                    mostraErrore(erroreBox, '');
                    const tasto = contenuto.querySelector('#gp-dati-save');
                    tasto.disabled = true;
                    try {
                        const dati = readPersonaForm(contenuto);
                        if (dati.codice_fiscale && !isValidCodiceFiscale(dati.codice_fiscale)) throw new Error('Codice Fiscale non valido');
                        dati.id = personaId;
                        await window.electronAPI.anagrafica.persone.update(dati);
                        toast('Dati aggiornati con successo', 'success');
                        openWorkspace(personaId);
                    } catch (err) {
                        mostraErrore(erroreBox, err.message || 'Errore durante il salvataggio.');
                    } finally {
                        tasto.disabled = false;
                    }
                });
            };

            const montaScheda = (idScheda) => {
                contenuto.innerHTML = '';
                contenuto.dataset.zona = (SCHEDE.find(s => s.id === idScheda) || SCHEDE[0]).zona;
                if (idScheda === 'dati') return mountDati();
                if (idScheda === 'contatti') return mountContattiSection(contenuto, { persona: p, tone: 'violet', onChange: (n) => aggiornaConteggio('contatti', n) });
                if (idScheda === 'famiglia') return renderPersonScopedCrudSubapp(contenuto, famigliaConfig(p, (n) => aggiornaConteggio('famiglia', n)));
                if (idScheda === 'documenti') return renderPersonScopedCrudSubapp(contenuto, documentiConfig(p, (n) => aggiornaConteggio('documenti', n)));
                if (idScheda === 'lavoro') return renderPersonScopedCrudSubapp(contenuto, lavoroConfig(p, (n) => aggiornaConteggio('lavoro', n)));
                if (idScheda === 'titoli') return renderPersonScopedCrudSubapp(contenuto, titoliConfig(p, (n) => aggiornaConteggio('titoli', n)));
                if (idScheda === 'bancari') return renderPersonScopedCrudSubapp(contenuto, bancariConfig(p, (n) => aggiornaConteggio('bancari', n)));
                if (idScheda === 'residenza') return renderPersonScopedCrudSubapp(contenuto, residenzaConfig(p, (n) => aggiornaConteggio('residenza', n)));
                return undefined;
            };

            for (const tasto of el.querySelectorAll('.ak-scheda')) {
                tasto.addEventListener('click', () => {
                    for (const altro of el.querySelectorAll('.ak-scheda')) altro.setAttribute('aria-selected', String(altro === tasto));
                    montaScheda(tasto.getAttribute('data-scheda'));
                });
            }

            montaScheda('dati');
        };

        try {
            if (params && params.personaId) await openWorkspace(params.personaId);
            else await renderDirectory();
        } catch (e) {
            console.error('[GestionePersonale] Avvio non riuscito:', e);
            el.innerHTML = `
                <div class="k-schermo">
                    <div class="ak-empty">
                        ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                        <h4>Avvio non riuscito</h4>
                        <p>${esc(e.message || 'Errore sconosciuto.')}</p>
                    </div>
                </div>`;
        }
    }
};
