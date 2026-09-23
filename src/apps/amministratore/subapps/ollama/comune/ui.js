import { esc } from '../../../../../js/shared/html.js';

export { esc };

export const opzioni = (elenco, selezionato) => elenco
    .map(voce => `<option value="${esc(voce.valore)}" ${String(voce.valore) === String(selezionato) ? 'selected' : ''}>${esc(voce.etichetta)}</option>`)
    .join('');

export const interruttore = (id, etichetta, attivo, aiuto = '') => `
    <div class="k-field k-field--full">
        <label class="k-switch" for="${id}"><input type="checkbox" id="${id}" ${attivo ? 'checked' : ''}><span class="k-switch-track" aria-hidden="true"></span>${esc(etichetta)}</label>
        ${aiuto ? `<span class="k-hint">${esc(aiuto)}</span>` : ''}
    </div>`;

export const scheda = (icona, titolo, sottotitolo, contenuto) => `
    <section class="k-card k-stack">
        <div>
            <h2 class="k-card-title"><span class="material-symbols-rounded" aria-hidden="true">${icona}</span>${esc(titolo)}</h2>
            ${sottotitolo ? `<p class="k-card-subtitle">${esc(sottotitolo)}</p>` : ''}
        </div>
        ${contenuto}
    </section>`;

export const campo = (id, etichetta, controllo, aiuto = '', pieno = false) => `
    <div class="k-field${pieno ? ' k-field--full' : ''}">
        <label class="k-label" for="${id}">${esc(etichetta)}</label>
        ${controllo}
        ${aiuto ? `<span class="k-hint">${esc(aiuto)}</span>` : ''}
    </div>`;

export function mostraEsito(elemento, tono, testo) {
    elemento.className = `k-alert k-alert--${tono}`;
    elemento.textContent = testo;
    elemento.hidden = false;
}
