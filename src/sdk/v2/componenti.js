import { esc, html, HtmlSicuro, formato, valida } from './utilita.js';

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

const TIPI_INPUT = { testo: 'text', email: 'email', telefono: 'tel', numero: 'number', euro: 'number', data: 'date', codiceFiscale: 'text', password: 'password' };

class KModulo extends HTMLElement {
    constructor() {
        super();
        this._campi = [];
        this._valori = {};
        this._uid = ++progressivo;
        this.onInvia = null;
    }

    set campi(valore) { this._campi = Array.isArray(valore) ? valore : []; this.render(); }
    get campi() { return this._campi; }
    set valori(valore) { this._valori = valore && typeof valore === 'object' ? { ...valore } : {}; this.render(); }
    get valori() { return this.leggiValori(); }

    connectedCallback() {
        if (!this._reso) this.render();
    }

    _campo(campo) {
        const id = `k-campo-${this._uid}-${campo.nome}`;
        const tipo = campo.tipo || 'testo';
        let valore = this._valori[campo.nome] ?? campo.predefinito ?? '';
        if (tipo === 'data' && typeof valore === 'string') valore = valore.slice(0, 10);
        const obbligatorio = campo.obbligatorio ? html`<span aria-hidden="true" style="color: var(--md-error);"> *</span>` : '';
        const disabilitato = campo.disabilitato ? 'disabled' : '';
        const pieno = campo.pieno || tipo === 'textarea';
        const aiuto = campo.suggerimento ? html`<span class="k-hint">${campo.suggerimento}</span>` : '';
        const errore = html`<span class="k-hint" data-errore="${campo.nome}" role="alert" style="color: var(--md-error);" hidden></span>`;

        if (tipo === 'checkbox') {
            return html`
                <div class="k-field${pieno ? ' k-field--full' : ''}">
                    <span class="k-label">${campo.etichetta}${obbligatorio}</span>
                    <label class="k-switch">
                        <input type="checkbox" id="${id}" name="${campo.nome}" aria-label="${campo.etichetta}" ${valore ? 'checked' : ''} ${disabilitato}>
                        <span class="k-switch-track" aria-hidden="true"></span>
                    </label>
                    ${aiuto}${errore}
                </div>`;
        }

        let controllo;
        if (tipo === 'textarea') {
            controllo = html`<textarea id="${id}" name="${campo.nome}" class="k-input" rows="${campo.righe || 3}" ${disabilitato}>${valore}</textarea>`;
        } else if (tipo === 'select') {
            const opzioni = (campo.opzioni || []).map(o => (typeof o === 'object' ? o : { valore: o, etichetta: o }));
            controllo = html`
                <select id="${id}" name="${campo.nome}" class="k-select" ${disabilitato}>
                    ${!campo.obbligatorio || valore === '' ? html`<option value="">—</option>` : ''}
                    ${opzioni.map(o => html`<option value="${o.valore}" ${String(o.valore) === String(valore) ? 'selected' : ''}>${o.etichetta}</option>`)}
                </select>`;
        } else {
            const extra = [];
            if (tipo === 'euro') extra.push('step="0.01"', 'min="0"');
            if (campo.min !== undefined) extra.push(`min="${esc(campo.min)}"`);
            if (campo.max !== undefined) extra.push(`max="${esc(campo.max)}"`);
            if (campo.passo !== undefined) extra.push(`step="${esc(campo.passo)}"`);
            if (tipo === 'codiceFiscale') extra.push('maxlength="16"', 'autocapitalize="characters"', 'style="text-transform: uppercase; font-family: var(--font-mono, monospace); letter-spacing: 0.04em;"');
            if (campo.lunghezzaMassima) extra.push(`maxlength="${esc(campo.lunghezzaMassima)}"`);
            controllo = html`<input id="${id}" name="${campo.nome}" class="k-input" type="${TIPI_INPUT[tipo] || 'text'}" value="${valore}" placeholder="${campo.segnaposto || ''}" autocomplete="off" ${new HtmlSicuro(extra.join(' '))} ${disabilitato}>`;
        }

        return html`
            <div class="k-field${pieno ? ' k-field--full' : ''}">
                <label class="k-label" for="${id}">${campo.etichetta}${obbligatorio}</label>
                ${controllo}${aiuto}${errore}
            </div>`;
    }

    render() {
        if (!this.isConnected) return;
        this._reso = true;
        const annulla = this.getAttribute('annulla');
        this.innerHTML = String(html`
            <form class="k-stack" novalidate>
                <div class="k-form-grid">${this._campi.map(campo => this._campo(campo))}</div>
                <div class="k-alert k-alert--danger" data-errore-generale hidden></div>
                <div class="k-row k-row--end"${this.hasAttribute('senza-pulsanti') ? ' hidden' : ''}>
                    ${annulla !== null ? html`<button type="button" class="k-btn k-btn--ghost" data-annulla>${annulla || 'Annulla'}</button>` : ''}
                    <button type="submit" class="k-btn k-btn--primary">${this.getAttribute('etichetta-invio') || 'Salva'}</button>
                </div>
            </form>`);
        const form = this.querySelector('form');
        form.addEventListener('submit', evento => this._invia(evento));
        this.querySelector('[data-annulla]')?.addEventListener('click', () => this.dispatchEvent(new CustomEvent('k-annulla', { bubbles: true })));
    }

    leggiValori() {
        const form = this.querySelector('form');
        const letti = {};
        if (!form) return { ...this._valori };
        for (const campo of this._campi) {
            const elemento = form.elements[campo.nome];
            if (!elemento) continue;
            const tipo = campo.tipo || 'testo';
            if (tipo === 'checkbox') letti[campo.nome] = elemento.checked;
            else if (tipo === 'numero' || tipo === 'euro') letti[campo.nome] = elemento.value === '' ? null : Number(elemento.value);
            else if (tipo === 'codiceFiscale') letti[campo.nome] = elemento.value.trim().toUpperCase();
            else letti[campo.nome] = tipo === 'textarea' ? elemento.value : elemento.value.trim();
        }
        return { ...this._valori, ...letti };
    }

    valida() {
        const valori = this.leggiValori();
        const errori = {};
        for (const campo of this._campi) {
            const valore = valori[campo.nome];
            const tipo = campo.tipo || 'testo';
            const vuoto = valore === null || valore === undefined || valore === '' || (tipo === 'checkbox' && !valore);
            if (vuoto) {
                if (campo.obbligatorio) {
                    errori[campo.nome] = 'Campo obbligatorio';
                } else if (typeof campo.valida === 'function') {
                    const messaggio = campo.valida(valore, valori);
                    if (messaggio) errori[campo.nome] = messaggio;
                }
                continue;
            }
            if (tipo === 'email' && !valida.email(valore)) errori[campo.nome] = 'Indirizzo email non valido';
            else if (tipo === 'codiceFiscale' && !valida.codiceFiscale(valore)) errori[campo.nome] = 'Codice fiscale non valido';
            else if (tipo === 'telefono' && !valida.telefono(valore)) errori[campo.nome] = 'Numero di telefono non valido';
            else if ((tipo === 'numero' || tipo === 'euro') && !Number.isFinite(valore)) errori[campo.nome] = 'Inserisci un numero';
            else if (campo.min !== undefined && Number(valore) < campo.min) errori[campo.nome] = `Il minimo è ${campo.min}`;
            else if (campo.max !== undefined && Number(valore) > campo.max) errori[campo.nome] = `Il massimo è ${campo.max}`;
            else if (typeof campo.valida === 'function') {
                const messaggio = campo.valida(valore, valori);
                if (messaggio) errori[campo.nome] = messaggio;
            }
        }

        this.querySelectorAll('[data-errore]').forEach((span) => {
            const messaggio = errori[span.dataset.errore];
            span.textContent = messaggio || '';
            span.hidden = !messaggio;
            const controllo = this.querySelector(`[name="${CSS.escape(span.dataset.errore)}"]`);
            if (controllo) controllo.toggleAttribute('aria-invalid', Boolean(messaggio));
        });
        const primo = Object.keys(errori)[0];
        if (primo) this.querySelector(`[name="${CSS.escape(primo)}"]`)?.focus();
        return { valido: !primo, errori, valori };
    }

    // Invio da un pulsante esterno (attributo senza-pulsanti). Restituisce true se riuscito.
    invia() {
        return this._invia(null);
    }

    async _invia(evento) {
        if (evento) evento.preventDefault();
        const generale = this.querySelector('[data-errore-generale]');
        generale.hidden = true;
        const { valido, valori } = this.valida();
        if (!valido) return false;
        if (typeof this.onInvia !== 'function') {
            this.dispatchEvent(new CustomEvent('k-invia', { detail: valori, bubbles: true }));
            return true;
        }
        const pulsante = this.querySelector('button[type="submit"]');
        pulsante.setAttribute('aria-busy', 'true');
        pulsante.disabled = true;
        try {
            await this.onInvia(valori);
            return true;
        } catch (errore) {
            generale.innerHTML = String(html`<span class="material-symbols-rounded">error</span><div>${(errore && errore.message) || 'Salvataggio non riuscito'}</div>`);
            generale.hidden = false;
            generale.scrollIntoView({ block: 'nearest' });
            return false;
        } finally {
            pulsante.removeAttribute('aria-busy');
            pulsante.disabled = false;
        }
    }
}

definisci('k-vuoto', KVuoto);
definisci('k-caricamento', KCaricamento);
definisci('k-intestazione', KIntestazione);
definisci('k-statistica', KStatistica);
definisci('k-tabella', KTabella);
definisci('k-modulo', KModulo);
