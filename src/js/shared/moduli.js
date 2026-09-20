import { esc } from './html.js';
import { icona3d, icona3dImmagine, applicaRipieghiImmagine, TINTE, ZONE, zona as descriviZona } from './tinte.js';

const RIPIEGO = 'icone/applicazione_generica.png';

const TINTE_MODULI = {
    dati_anagrafici: 'indaco',
    contatti: 'violetto',
    famiglia: 'rosa',
    documenti: 'ambra',
    lavoro: 'pino',
    titoli_studio: 'cobalto',
    dati_bancari: 'verde',
    residenza_domicilio: 'ruggine',
    utenti: 'indaco',
    rbac: 'violetto',
    credenziali: 'ambra',
    sicurezza: 'rosa',
    dati_azienda: 'cobalto',
    nodi: 'acqua',
    database: 'verde',
    smtp: 'pino',
    notifiche: 'ruggine',
    registro_accessi: 'ardesia',
    aggiornamenti: 'acqua',
    errori: 'ruggine',
    errori_sync: 'ambra'
};

const ZONE_MODULI = {
    dati_anagrafici: 'identita',
    contatti: 'contatti',
    famiglia: 'famiglia',
    documenti: 'documenti',
    lavoro: 'lavoro',
    titoli_studio: 'titoli',
    dati_bancari: 'bancari',
    residenza_domicilio: 'residenza'
};

const impronta = (testo) => {
    let somma = 0;
    for (let i = 0; i < testo.length; i += 1) somma = (somma * 31 + testo.charCodeAt(i)) % 104729;
    return somma;
};

export const tintaDiModulo = (chiave) => {
    const nome = String(chiave || '');
    if (TINTE_MODULI[nome]) return TINTE_MODULI[nome];
    return TINTE[impronta(nome) % TINTE.length];
};

export const attributoDiModulo = (chiave) => {
    const nome = String(chiave || '');
    if (ZONE_MODULI[nome] && Object.prototype.hasOwnProperty.call(ZONE, ZONE_MODULI[nome])) {
        return ` data-zona="${ZONE_MODULI[nome]}"`;
    }
    return ` data-tinta="${tintaDiModulo(nome)}"`;
};

const iconaDiModulo = (modulo, cartellaBase) => {
    const nome = modulo.icon || '';
    const eImmagine = nome.includes('.') || nome.includes('/');
    if (!eImmagine) {
        const zonaModulo = ZONE_MODULI[modulo.folder];
        const glifo = nome || (zonaModulo ? descriviZona(zonaModulo).icona : 'extension');
        return icona3d(glifo, { dimensione: 'xl', varianti: ['reattiva'] });
    }
    const percorso = `${cartellaBase}/${encodeURIComponent(modulo.folder)}/${nome.split('/').map(encodeURIComponent).join('/')}`;
    return icona3dImmagine(percorso, { dimensione: 'xl', varianti: ['vetro', 'reattiva'], ripiego: RIPIEGO });
};

const cardHtml = (modulo, cartellaBase) => `
    <button type="button" class="k-modulo" data-id="${esc(modulo.folder)}"${attributoDiModulo(modulo.folder)}>
        ${iconaDiModulo(modulo, cartellaBase)}
        <span class="k-modulo-nome">${esc(modulo.name)}</span>
        ${modulo.description ? `<span class="k-modulo-testo">${esc(modulo.description)}</span>` : ''}
        <span class="k-modulo-apri"><span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span>Apri</span>
    </button>
`;

export function renderModuliHome(el, opzioni) {
    const {
        titolo,
        sottotitolo,
        icona = 'apps',
        tinta = 'ardesia',
        moduli = [],
        cartellaBase,
        segnaposto = 'Cerca modulo…',
        onApri
    } = opzioni;

    el.innerHTML = `
        <div class="k-schermo fade-in-up" data-tinta="${esc(tinta)}">
            <div class="k-schermo-testa">
                <div class="k-page-heading">
                    ${icona3d(icona, { dimensione: 'lg', varianti: ['reattiva'] })}
                    <div>
                        <h1 class="k-page-title">${esc(titolo)}</h1>
                        <p class="k-page-subtitle">${esc(sottotitolo)}</p>
                    </div>
                </div>
                <label class="k-cerca" style="flex: 1 1 16rem; max-inline-size: 24rem;">
                    <span class="material-symbols-rounded">search</span>
                    <input type="search" id="modulo-search" placeholder="${esc(segnaposto)}" aria-label="${esc(segnaposto)}">
                </label>
            </div>
            <div class="k-schermo-corpo">
                <div id="moduli-griglia" class="k-moduli"></div>
            </div>
        </div>
    `;

    const griglia = el.querySelector('#moduli-griglia');
    const ricerca = el.querySelector('#modulo-search');

    const disegna = (testo) => {
        const cercato = (testo || '').toLowerCase();
        const trovati = moduli.filter(m =>
            (m.name || '').toLowerCase().includes(cercato) ||
            (m.description || '').toLowerCase().includes(cercato));
        if (trovati.length === 0) {
            griglia.innerHTML = `
                <div class="k-empty" style="grid-column: 1 / -1;">
                    ${icona3d('search_off', { dimensione: 'lg', varianti: ['tenue'] })}
                    <div class="k-empty-title">Nessun modulo trovato</div>
                    <p class="k-empty-text">Prova con un altro termine di ricerca.</p>
                </div>`;
            return;
        }
        griglia.innerHTML = trovati.map(m => cardHtml(m, cartellaBase)).join('');
        applicaRipieghiImmagine(griglia);
        for (const card of griglia.querySelectorAll('.k-modulo')) {
            card.addEventListener('click', () => onApri(card.getAttribute('data-id')));
        }
    };

    ricerca.addEventListener('input', () => disegna(ricerca.value));
    disegna('');

    return { disegna };
}

export default renderModuliHome;
