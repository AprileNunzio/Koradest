import { html, esc, HtmlSicuro } from '../utilita.js';
import { tipoDi } from './validazione.js';

const TIPI_INPUT = { testo: 'text', email: 'email', telefono: 'tel', numero: 'number', euro: 'number', data: 'date', codiceFiscale: 'text', partitaIva: 'text', password: 'password' };

function attributiExtra(campo) {
    const tipo = tipoDi(campo);
    const extra = [];
    if (tipo === 'euro') extra.push('step="0.01"', 'min="0"');
    if (campo.min !== undefined) extra.push(`min="${esc(campo.min)}"`);
    if (campo.max !== undefined) extra.push(`max="${esc(campo.max)}"`);
    if (campo.passo !== undefined) extra.push(`step="${esc(campo.passo)}"`);
    if (tipo === 'codiceFiscale') extra.push('maxlength="16"', 'autocapitalize="characters"', 'class="k-input k-input--codice"');
    else extra.push('class="k-input"');
    if (tipo === 'partitaIva') extra.push('maxlength="11"', 'inputmode="numeric"');
    if (campo.lunghezzaMassima) extra.push(`maxlength="${esc(campo.lunghezzaMassima)}"`);
    return new HtmlSicuro(extra.join(' '));
}

function controllo(campo, id, valore, descrittori) {
    const tipo = tipoDi(campo);
    const disabilitato = campo.disabilitato ? 'disabled' : '';
    const obbligatorio = campo.obbligatorio ? 'aria-required="true"' : '';
    if (tipo === 'checkbox') {
        return html`
            <label class="k-switch">
                <input type="checkbox" id="${id}" name="${campo.nome}" aria-label="${campo.etichetta}" aria-describedby="${descrittori}" ${valore ? 'checked' : ''} ${disabilitato}>
                <span class="k-switch-track" aria-hidden="true"></span>
            </label>`;
    }
    if (tipo === 'textarea') {
        return html`<textarea id="${id}" name="${campo.nome}" class="k-input" rows="${campo.righe || 3}" aria-describedby="${descrittori}" ${new HtmlSicuro(obbligatorio)} ${disabilitato}>${valore}</textarea>`;
    }
    if (tipo === 'select') {
        const opzioni = (campo.opzioni || []).map(opzione => (typeof opzione === 'object' ? opzione : { valore: opzione, etichetta: opzione }));
        return html`
            <select id="${id}" name="${campo.nome}" class="k-select" aria-describedby="${descrittori}" ${new HtmlSicuro(obbligatorio)} ${disabilitato}>
                ${!campo.obbligatorio || valore === '' ? html`<option value="">—</option>` : ''}
                ${opzioni.map(opzione => html`<option value="${opzione.valore}" ${String(opzione.valore) === String(valore) ? 'selected' : ''}>${opzione.etichetta}</option>`)}
            </select>`;
    }
    return html`<input id="${id}" name="${campo.nome}" type="${TIPI_INPUT[tipo] || 'text'}" value="${valore}" placeholder="${campo.segnaposto || ''}" autocomplete="off" aria-describedby="${descrittori}" ${attributiExtra(campo)} ${new HtmlSicuro(obbligatorio)} ${disabilitato}>`;
}

function pulsanteStorico(campo) {
    return html`
        <button type="button" class="k-campo-storico" data-storico="${campo.nome}" title="Storico delle modifiche" aria-label="Storico delle modifiche di ${campo.etichetta}" disabled>
            <span class="material-symbols-rounded" aria-hidden="true">history</span>
        </button>`;
}

export function markupCampo(campo, { uid, valore, conStorico }) {
    const id = `k-campo-${uid}-${campo.nome}`;
    const tipo = tipoDi(campo);
    const pieno = campo.pieno || tipo === 'textarea';
    const idMessaggio = `${id}-messaggio`;
    const idAiuto = `${id}-aiuto`;
    const descrittori = campo.suggerimento ? `${idMessaggio} ${idAiuto}` : idMessaggio;
    const valoreIniziale = tipo === 'data' && typeof valore === 'string' ? valore.slice(0, 10) : valore;
    const etichetta = tipo === 'checkbox'
        ? html`<span class="k-label">${campo.etichetta}${campo.obbligatorio ? html`<span class="k-required" aria-hidden="true">*</span>` : ''}</span>`
        : html`<label class="k-label" for="${id}">${campo.etichetta}${campo.obbligatorio ? html`<span class="k-required" aria-hidden="true">*</span>` : ''}</label>`;
    return html`
        <div class="k-field k-campo${pieno ? ' k-field--full' : ''}" data-campo="${campo.nome}">
            ${etichetta}
            <div class="k-campo-riga">
                <div class="k-campo-controllo">${controllo(campo, id, valoreIniziale, descrittori)}</div>
                ${conStorico ? pulsanteStorico(campo) : ''}
            </div>
            ${campo.suggerimento ? html`<span class="k-hint" id="${idAiuto}">${campo.suggerimento}</span>` : ''}
            <span class="k-campo-messaggio" id="${idMessaggio}" data-messaggio role="status" aria-live="polite" hidden></span>
        </div>`;
}
