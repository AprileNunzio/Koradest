import { esc, html, HtmlSicuro, formato } from './utilita.js';
import { KModulo } from './modulo/k_modulo.js';

// Web components delle app v2. Lavorano nel DOM normale (niente shadow DOM) e usano
// le classi k- del design system, cosi un'app ha lo stesso aspetto del core.

const definisci = (nome, classe) => {
    if (!customElements.get(nome)) customElements.define(nome, classe);
};

let progressivo = 0;

function conserva(elemento) {
    if (!elemento._figli) {
        elemento._figli = [...elemento.childNodes];
        elemento._figli.forEach(nodo => nodo.remove());
    }
    return elemento._figli;
}

class KVuoto extends HTMLElement {
    static get observedAttributes() { return ['icona', 'titolo', 'testo']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
        const figli = conserva(this);
        const testo = this.getAttribute('testo');
        this.innerHTML = String(html`
            <div class="k-card k-empty">
                <span class="material-symbols-rounded">${this.getAttribute('icona') || 'inbox'}</span>
                <div class="k-empty-title">${this.getAttribute('titolo') || 'Nessun elemento'}</div>
                ${testo ? html`<p class="k-empty-text">${testo}</p>` : ''}
                <div class="k-row" data-azioni style="justify-content: center;"></div>
            </div>`);
        const azioni = this.querySelector('[data-azioni]');
        if (figli.length === 0) azioni.remove();
        else figli.forEach(nodo => azioni.appendChild(nodo));
    }
}

class KCaricamento extends HTMLElement {
    connectedCallback() {
        this.innerHTML = String(html`<div class="k-loading" style="min-height: 10rem;"><div class="k-spinner"></div><span>${this.getAttribute('testo') || 'Caricamento...'}</span></div>`);
    }
}

class KIntestazione extends HTMLElement {
    static get observedAttributes() { return ['titolo', 'sottotitolo', 'icona']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
        const figli = conserva(this);
        const icona = this.getAttribute('icona');
        const sottotitolo = this.getAttribute('sottotitolo');
        this.innerHTML = String(html`
            <header class="k-page-header">
                <div class="k-page-heading">
                    ${icona ? html`<span class="k-page-icon material-symbols-rounded">${icona}</span>` : ''}
                    <div>
                        <h1 class="k-page-title">${this.getAttribute('titolo') || ''}</h1>
                        ${sottotitolo ? html`<p class="k-page-subtitle">${sottotitolo}</p>` : ''}
                    </div>
                </div>
                <div class="k-page-actions"></div>
            </header>`);
        const azioni = this.querySelector('.k-page-actions');
        figli.forEach(nodo => azioni.appendChild(nodo));
    }
}

class KStatistica extends HTMLElement {
    static get observedAttributes() { return ['etichetta', 'valore', 'icona', 'tono']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
        const tono = ['primary', 'success', 'warning', 'error'].includes(this.getAttribute('tono')) ? this.getAttribute('tono') : 'primary';
        this.innerHTML = String(html`
            <div class="k-card k-stat">
                <span class="k-stat-icon material-symbols-rounded" style="background: var(--md-${tono}-container); color: var(--md-${tono});">${this.getAttribute('icona') || 'insights'}</span>
                <div>
                    <div class="k-stat-value">${this.getAttribute('valore') ?? ''}</div>
                    <div class="k-stat-label">${this.getAttribute('etichetta') || ''}</div>
                </div>
            </div>`);
    }
}

function cella(colonna, riga) {
    if (typeof colonna.render === 'function') {
        const valore = colonna.render(riga);
        return valore instanceof HtmlSicuro ? valore : esc(valore);
    }
    const valore = riga[colonna.campo];
    const formattatore = typeof colonna.formato === 'string' ? formato[colonna.formato] : null;
    return esc(formattatore ? formattatore(valore) : (valore ?? ''));
}

function testoRicerca(colonne, riga) {
    const grezzi = Object.values(riga).filter(valore => ['string', 'number'].includes(typeof valore));
    const formattati = colonne
        .filter(colonna => typeof colonna.formato === 'string' && formato[colonna.formato])
        .map(colonna => formato[colonna.formato](riga[colonna.campo]));
    return [...grezzi, ...formattati].join(' ').toLowerCase();
}

class KTabella extends HTMLElement {
    constructor() {
        super();
        this._colonne = [];
        this._righe = [];
        this._azioni = [];
        this._filtro = '';
        this._ordine = null;
        this._visibili = [];
        this.addEventListener('input', (evento) => {
            if (!evento.target.matches('[data-cerca]')) return;
            this._filtro = evento.target.value;
            this._aggiorna();
        });
        this.addEventListener('click', evento => this._clic(evento));
        this.addEventListener('keydown', (evento) => {
            const riga = evento.target.closest && evento.target.closest('tr[data-indice]');
            if (riga && evento.key === 'Enter' && evento.target === riga) this._apriRiga(riga);
        });
    }

    set colonne(valore) { this._colonne = Array.isArray(valore) ? valore : []; this._struttura(); }
    get colonne() { return this._colonne; }
    set righe(valore) { this._righe = Array.isArray(valore) ? valore : []; this._aggiorna(); }
    get righe() { return this._righe; }
    set azioni(valore) { this._azioni = Array.isArray(valore) ? valore : []; this._aggiorna(); }
    get azioni() { return this._azioni; }

    connectedCallback() {
        if (!this._pronta) this._struttura();
    }

    _struttura() {
        if (!this.isConnected) return;
        this._pronta = true;
        const cerca = this.getAttribute('cerca');
        this.innerHTML = String(html`
            <div class="k-stack" style="--k-gap: var(--k-space-3);">
                ${cerca !== null ? html`
                    <div class="k-input-group" style="max-width: 22rem;">
                        <span class="material-symbols-rounded">search</span>
                        <input type="search" class="k-input" data-cerca placeholder="${cerca || 'Cerca...'}" aria-label="${cerca || 'Cerca'}" value="${this._filtro}">
                    </div>` : ''}
                <div data-corpo></div>
            </div>`);
        this._aggiorna();
    }

    _aggiorna() {
        if (!this._pronta) return;
        const corpo = this.querySelector('[data-corpo]');
        if (!corpo) return;
        const filtro = this._filtro.trim().toLowerCase();
        let visibili = filtro ? this._righe.filter(riga => testoRicerca(this._colonne, riga).includes(filtro)) : [...this._righe];
        if (this._ordine) {
            const { campo, verso } = this._ordine;
            const confronta = new Intl.Collator('it', { numeric: true, sensitivity: 'base' });
            visibili.sort((a, b) => verso * confronta.compare(String(a[campo] ?? ''), String(b[campo] ?? '')));
        }
        this._visibili = visibili;

        if (this._righe.length === 0) {
            corpo.innerHTML = String(html`<k-vuoto icona="${this.getAttribute('vuoto-icona') || 'inbox'}" titolo="${this.getAttribute('vuoto-titolo') || 'Nessun elemento'}" testo="${this.getAttribute('vuoto-testo') || ''}"></k-vuoto>`);
            return;
        }
        if (visibili.length === 0) {
            corpo.innerHTML = String(html`<k-vuoto icona="search_off" titolo="Nessun risultato" testo="Nessun elemento corrisponde a “${this._filtro}”."></k-vuoto>`);
            return;
        }

        const cliccabili = this.hasAttribute('righe-cliccabili');
        const conAzioni = this._azioni.length > 0;
        corpo.innerHTML = String(html`
            <div class="k-table-wrap">
                <table class="k-table">
                    <thead>
                        <tr>
                            ${this._colonne.map((colonna, indice) => {
                                const allinea = colonna.allinea || (['euro', 'numero', 'percentuale'].includes(colonna.formato) ? 'right' : 'left');
                                const attivo = this._ordine && this._ordine.campo === colonna.campo;
                                const freccia = attivo ? (this._ordine.verso > 0 ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';
                                return html`<th style="text-align: ${allinea};${colonna.larghezza ? ` width: ${colonna.larghezza};` : ''}" ${attivo ? html`aria-sort="${this._ordine.verso > 0 ? 'ascending' : 'descending'}"` : ''}>
                                    ${colonna.campo && colonna.ordinabile !== false
                                        ? html`<button type="button" data-ordina="${indice}" style="all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">${colonna.titolo}<span class="material-symbols-rounded" style="font-size: 1rem; opacity: ${attivo ? 1 : 0.4};">${freccia}</span></button>`
                                        : colonna.titolo}
                                </th>`;
                            })}
                            ${conAzioni ? html`<th class="k-table-actions"><span class="k-sr-only">Azioni</span></th>` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${visibili.map((riga, indiceRiga) => html`
                            <tr data-indice="${indiceRiga}" ${cliccabili ? html`tabindex="0" style="cursor: pointer;"` : ''}>
                                ${this._colonne.map((colonna) => {
                                    const allinea = colonna.allinea || (['euro', 'numero', 'percentuale'].includes(colonna.formato) ? 'right' : 'left');
                                    const numerica = ['euro', 'numero', 'percentuale', 'data', 'dataOra'].includes(colonna.formato);
                                    return html`<td style="text-align: ${allinea};${numerica ? ' font-variant-numeric: tabular-nums; white-space: nowrap;' : ''}">${new HtmlSicuro(String(cella(colonna, riga)))}</td>`;
                                })}
                                ${conAzioni ? html`<td class="k-table-actions"><div class="k-row k-row--end" style="--k-gap: var(--k-space-1); flex-wrap: nowrap;">
                                    ${this._azioni.map((azione, indiceAzione) => (typeof azione.visibile === 'function' && !azione.visibile(riga)) ? '' : html`
                                        <button type="button" class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-azione="${indiceAzione}" title="${azione.titolo}" aria-label="${azione.titolo}"${azione.pericolosa ? html` style="color: var(--md-error);"` : ''}>
                                            <span class="material-symbols-rounded">${azione.icona || 'more_horiz'}</span>
                                        </button>`)}
                                </div></td>` : ''}
                            </tr>`)}
                    </tbody>
                </table>
            </div>
            ${filtro ? html`<p class="k-hint">${visibili.length} di ${this._righe.length} elementi</p>` : ''}`);
    }

    _apriRiga(tr) {
        const riga = this._visibili[Number(tr.dataset.indice)];
        if (riga) this.dispatchEvent(new CustomEvent('k-riga', { detail: riga, bubbles: true }));
    }

    _clic(evento) {
        const ordina = evento.target.closest('[data-ordina]');
        if (ordina) {
            const colonna = this._colonne[Number(ordina.dataset.ordina)];
            const verso = this._ordine && this._ordine.campo === colonna.campo ? -this._ordine.verso : 1;
            this._ordine = { campo: colonna.campo, verso };
            this._aggiorna();
            return;
        }
        const pulsante = evento.target.closest('[data-azione]');
        const tr = evento.target.closest('tr[data-indice]');
        if (pulsante && tr) {
            evento.stopPropagation();
            const azione = this._azioni[Number(pulsante.dataset.azione)];
            const riga = this._visibili[Number(tr.dataset.indice)];
            if (typeof azione.esegui === 'function') azione.esegui(riga);
            this.dispatchEvent(new CustomEvent('k-azione', { detail: { azione: azione.id || null, riga }, bubbles: true }));
            return;
        }
        if (tr && this.hasAttribute('righe-cliccabili') && !evento.target.closest('a, button, input, select, textarea')) {
            this._apriRiga(tr);
        }
    }
}

definisci('k-vuoto', KVuoto);
definisci('k-caricamento', KCaricamento);
definisci('k-intestazione', KIntestazione);
definisci('k-statistica', KStatistica);
definisci('k-tabella', KTabella);
definisci('k-modulo', KModulo);
