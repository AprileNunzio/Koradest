import { esc } from './html.js';

export const TINTE = ['indaco', 'violetto', 'acqua', 'verde', 'ambra', 'rosa', 'ardesia', 'cobalto', 'pino', 'ruggine'];

export const ZONE = {
    identita: { ordine: 1, tinta: 'indaco', icona: 'badge', etichetta: 'Identità' },
    nascita: { ordine: 2, tinta: 'acqua', icona: 'public', etichetta: 'Nascita' },
    contatti: { ordine: 3, tinta: 'violetto', icona: 'contacts', etichetta: 'Contatti' },
    famiglia: { ordine: 4, tinta: 'rosa', icona: 'family_restroom', etichetta: 'Famiglia' },
    documenti: { ordine: 5, tinta: 'ambra', icona: 'folder_shared', etichetta: 'Documenti' },
    lavoro: { ordine: 6, tinta: 'pino', icona: 'work', etichetta: 'Lavoro' },
    titoli: { ordine: 7, tinta: 'cobalto', icona: 'school', etichetta: 'Titoli di studio' },
    bancari: { ordine: 8, tinta: 'verde', icona: 'account_balance', etichetta: 'Dati bancari' },
    residenza: { ordine: 9, tinta: 'ruggine', icona: 'home', etichetta: 'Residenza' },
    sistema: { ordine: 10, tinta: 'ardesia', icona: 'settings', etichetta: 'Sistema' }
};

const ZONA_PREDEFINITA = ZONE.sistema;

export const zona = (nome) => ZONE[nome] || ZONA_PREDEFINITA;

export const tintaDiZona = (nome) => zona(nome).tinta;

export const iconaDiZona = (nome) => zona(nome).icona;

export const ordinaPerZona = (elenco, leggiZona) => [...elenco]
    .sort((a, b) => zona(leggiZona(a)).ordine - zona(leggiZona(b)).ordine);

export const ARTE_3D_BASE = 'icone/3d/';

const DIMENSIONI = new Set(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']);
const VARIANTI = new Set(['tenue', 'vetro', 'tondo', 'reattiva', 'successo', 'attenzione', 'errore', 'informazione', 'neutra']);
const NOME_ICONA = /^[a-z0-9_]{1,48}$/;

const classiIcona = (dimensione, varianti) => {
    const classi = ['k-i3d'];
    if (DIMENSIONI.has(dimensione)) classi.push(`k-i3d--${dimensione}`);
    for (const variante of varianti) {
        if (VARIANTI.has(variante)) classi.push(`k-i3d--${variante}`);
    }
    return classi.join(' ');
};

export function icona3d(nome, opzioni = {}) {
    const { dimensione = 'md', varianti = [], zona: nomeZona = null, tinta = null, titolo = null, arte = true } = opzioni;
    const glifo = NOME_ICONA.test(String(nome)) ? String(nome) : 'help';
    const scelte = Array.isArray(varianti) ? varianti : [varianti];
    const tintaScelta = tinta && TINTE.includes(tinta) ? tinta : null;
    const attributi = [`class="${classiIcona(dimensione, scelte)}"`];
    if (nomeZona && ZONE[nomeZona]) attributi.push(`data-zona="${esc(nomeZona)}"`);
    else if (tintaScelta) attributi.push(`data-tinta="${tintaScelta}"`);
    attributi.push(titolo ? `role="img" aria-label="${esc(titolo)}"` : 'aria-hidden="true"');
    const disegno = arte ? `<img class="k-i3d-arte" src="${ARTE_3D_BASE}${glifo}.png" alt="" loading="lazy" data-arte>` : '';
    return `<span ${attributi.join(' ')}>${disegno}<span class="material-symbols-rounded">${glifo}</span></span>`;
}

export function attivaArte3d(radice) {
    if (!radice || typeof radice.querySelectorAll !== 'function') return;
    for (const immagine of radice.querySelectorAll('img.k-i3d-arte[data-arte]')) {
        immagine.removeAttribute('data-arte');
        const piastra = immagine.parentElement;
        if (!piastra) continue;
        const accetta = () => {
            if (immagine.naturalWidth > 0) piastra.dataset.arte = 'si';
        };
        if (immagine.complete) accetta();
        else immagine.addEventListener('load', accetta, { once: true });
        immagine.addEventListener('error', () => immagine.remove(), { once: true });
    }
}

let osservatoreArte = null;

export function osservaArte3d(radice = document.body) {
    if (osservatoreArte || !radice) return;
    attivaArte3d(radice);
    osservatoreArte = new MutationObserver((mutazioni) => {
        for (const mutazione of mutazioni) {
            for (const nodo of mutazione.addedNodes) {
                if (nodo.nodeType !== 1) continue;
                if (nodo.matches && nodo.matches('img.k-i3d-arte[data-arte]')) attivaArte3d(nodo.parentElement);
                attivaArte3d(nodo);
            }
        }
    });
    osservatoreArte.observe(radice, { childList: true, subtree: true });
}

export function icona3dImmagine(percorso, opzioni = {}) {
    const { dimensione = 'lg', varianti = ['vetro'], alternativa = '', ripiego = null } = opzioni;
    const scelte = Array.isArray(varianti) ? varianti : [varianti];
    const errore = ripiego ? ` data-ripiego="${esc(ripiego)}"` : '';
    return `<span class="${classiIcona(dimensione, scelte)}" aria-hidden="true"><img src="${esc(percorso)}" alt="${esc(alternativa)}" loading="lazy"${errore}></span>`;
}

export function applicaRipieghiImmagine(radice) {
    if (!radice) return;
    for (const immagine of radice.querySelectorAll('img[data-ripiego]')) {
        const ripiego = immagine.getAttribute('data-ripiego');
        immagine.removeAttribute('data-ripiego');
        immagine.addEventListener('error', () => {
            if (immagine.dataset.ripiegoApplicato === 'si') return;
            immagine.dataset.ripiegoApplicato = 'si';
            immagine.src = ripiego;
        }, { once: true });
    }
}
