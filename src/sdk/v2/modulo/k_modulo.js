import { html } from '../utilita.js';
import { markupCampo } from './campi.js';
import { erroreCampo, erroriDi, leggiValore, vuoto } from './validazione.js';
import { STATI, impostaStato, statoDi, abilitaStorico } from './stato.js';
import { CodaSalvataggio } from './coda_salvataggio.js';
import { apriStorico } from './storico.js';

let progressivo = 0;

const oraCorrente = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

export class KModulo extends HTMLElement {
    constructor() {
        super();
        this._campi = [];
        this._valori = {};
        this._uid = ++progressivo;
        this._coda = new CodaSalvataggio(lotto => this._salvaLotto(lotto));
        this._onSalva = null;
        this.onInvia = null;
    }

    set onSalva(funzione) {
        this._onSalva = typeof funzione === 'function' ? funzione : null;
        if (this._reso) this.render();
    }

    get onSalva() { return this._onSalva; }

    set campi(valore) { this._campi = Array.isArray(valore) ? valore : []; this.render(); }
    get campi() { return this._campi; }
    set valori(valore) { this._valori = valore && typeof valore === 'object' ? { ...valore } : {}; this.render(); }
    get valori() { return this.leggiValori(); }
    get automatico() { return typeof this.onSalva === 'function'; }
    get idRecord() { return this._valori.id ?? null; }

    connectedCallback() {
        if (!this._reso) this.render();
    }

    disconnectedCallback() {
        this._coda.svuota();
    }

    _campo(nome) {
        return this._campi.find(campo => campo.nome === nome) || null;
    }

    render() {
        if (!this.isConnected) return;
        this._reso = true;
        this._coda.annulla();
        const annulla = this.getAttribute('annulla');
        const conStorico = this.hasAttribute('tabella');
        const pulsantiNascosti = this.hasAttribute('senza-pulsanti') || (this.automatico && annulla === null);
        this.innerHTML = String(html`
            <form class="k-stack k-modulo" novalidate>
                <div class="k-form-grid">${this._campi.map(campo => markupCampo(campo, { uid: this._uid, valore: this._valori[campo.nome] ?? campo.predefinito ?? '', conStorico }))}</div>
                <div class="k-alert k-alert--danger" data-errore-generale role="alert" hidden></div>
                <div class="k-modulo-stato" data-stato-modulo role="status" aria-live="polite" ${this.automatico ? '' : 'hidden'}>
                    <span class="material-symbols-rounded" aria-hidden="true" data-icona-stato>cloud_done</span>
                    <span data-testo-stato>${this.idRecord ? 'Le modifiche vengono salvate automaticamente' : 'Il record verrà creato appena i campi obbligatori sono completi'}</span>
                </div>
                <div class="k-row k-row--end"${pulsantiNascosti ? ' hidden' : ''}>
                    ${annulla !== null ? html`<button type="button" class="k-btn k-btn--ghost" data-annulla>${annulla || 'Annulla'}</button>` : ''}
                    <button type="submit" class="k-btn k-btn--primary"${this.automatico ? ' hidden' : ''}>${this.getAttribute('etichetta-invio') || 'Salva'}</button>
                </div>
            </form>`);
        const form = this.querySelector('form');
        form.addEventListener('submit', evento => this._invia(evento));
        form.addEventListener('input', evento => this._suModifica(evento, false));
        form.addEventListener('change', evento => this._suModifica(evento, true));
        form.addEventListener('click', evento => this._suClic(evento));
        abilitaStorico(this, conStorico && this.idRecord !== null);
    }

    _suModifica(evento, confermata) {
        const nome = evento.target && evento.target.name;
        const campo = nome ? this._campo(nome) : null;
        if (!campo) return;
        const inErrore = statoDi(this, nome) === STATI.ERRORE;
        if (!confermata && !inErrore && !this.automatico) return;
        const valori = this.leggiValori();
        const messaggio = erroreCampo(campo, valori[nome], valori);
        if (messaggio) {
            if (confermata || inErrore) impostaStato(this, nome, STATI.ERRORE, messaggio);
            return;
        }
        if (this.automatico) {
            impostaStato(this, nome, STATI.ATTESA, '');
            this._coda.programma(nome, { subito: confermata });
            return;
        }
        impostaStato(this, nome, vuoto(campo, valori[nome]) ? null : STATI.OK, '');
    }

    _suClic(evento) {
        const annulla = evento.target.closest('[data-annulla]');
        if (annulla) {
            this.dispatchEvent(new CustomEvent('k-annulla', { bubbles: true }));
            return;
        }
        const storico = evento.target.closest('[data-storico]');
        if (!storico || this.idRecord === null) return;
        const campo = this._campo(storico.dataset.storico);
        apriStorico({ tabella: this.getAttribute('tabella'), id: this.idRecord, campo });
    }

    _statoModulo(icona, testo, tono = '') {
        const barra = this.querySelector('[data-stato-modulo]');
        if (!barra) return;
        barra.dataset.tono = tono;
        barra.querySelector('[data-icona-stato]').textContent = icona;
        barra.querySelector('[data-testo-stato]').textContent = testo;
    }

    async _salvaLotto(lotto) {
        const valori = this.leggiValori();
        const errori = erroriDi(this._campi, valori);
        const rimandati = this._campi.map(campo => campo.nome).filter(nome => statoDi(this, nome) === STATI.ATTESA);
        const nomi = [...new Set([...lotto, ...rimandati])].filter(nome => this._campo(nome));
        nomi.filter(nome => errori[nome]).forEach(nome => impostaStato(this, nome, STATI.ERRORE, errori[nome]));
        const validi = nomi.filter(nome => !errori[nome]);
        if (validi.length === 0) return;
        const nuovo = this.idRecord === null;
        if (nuovo && Object.keys(errori).length > 0) {
            this._statoModulo('pending', 'Completa i campi obbligatori: il record verrà creato automaticamente');
            return;
        }
        validi.forEach(nome => impostaStato(this, nome, STATI.SALVATAGGIO, 'Salvataggio…'));
        this._statoModulo('sync', 'Salvataggio in corso…');
        const esito = await Promise.resolve()
            .then(() => this.onSalva({ ...valori }, { campi: validi, nuovo }))
            .then(risultato => ({ risultato }), errore => ({ errore }));
        if (esito.errore) {
            const messaggio = (esito.errore && esito.errore.message) || 'Salvataggio non riuscito';
            validi.forEach(nome => impostaStato(this, nome, STATI.ERRORE, messaggio));
            this._statoModulo('cloud_off', `Non salvato: ${messaggio}`, 'errore');
            return;
        }
        const risultato = esito.risultato;
        if (nuovo && risultato && typeof risultato === 'object' && risultato.id !== undefined) this._valori.id = risultato.id;
        validi.forEach(nome => impostaStato(this, nome, STATI.OK, ''));
        abilitaStorico(this, this.hasAttribute('tabella') && this.idRecord !== null);
        this._statoModulo('cloud_done', `Tutte le modifiche sono salvate · ${oraCorrente()}`, 'ok');
        this.dispatchEvent(new CustomEvent('k-salvato', { detail: { valori: { ...valori, id: this.idRecord }, campi: validi, nuovo }, bubbles: true }));
    }

    attendiSalvataggi() {
        return this._coda.attendi();
    }

    leggiValori() {
        const form = this.querySelector('form');
        if (!form) return { ...this._valori };
        const letti = Object.fromEntries(this._campi
            .filter(campo => form.elements[campo.nome])
            .map(campo => [campo.nome, leggiValore(campo, form.elements[campo.nome])]));
        return { ...this._valori, ...letti };
    }

    valida() {
        const valori = this.leggiValori();
        const errori = erroriDi(this._campi, valori);
        this._campi.forEach((campo) => {
            if (errori[campo.nome]) impostaStato(this, campo.nome, STATI.ERRORE, errori[campo.nome]);
            else impostaStato(this, campo.nome, vuoto(campo, valori[campo.nome]) ? null : STATI.OK, '');
        });
        const primo = Object.keys(errori)[0];
        if (primo) this.querySelector(`[name="${CSS.escape(primo)}"]`)?.focus();
        return { valido: !primo, errori, valori };
    }

    invia() {
        return this._invia(null);
    }

    async _invia(evento) {
        if (evento) evento.preventDefault();
        if (this.automatico) {
            this._campi.forEach(campo => this._coda.programma(campo.nome, { subito: true }));
            await this._coda.attendi();
            return this.valida().valido;
        }
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
        const esito = await Promise.resolve()
            .then(() => this.onInvia(valori))
            .then(() => null, errore => errore);
        pulsante.removeAttribute('aria-busy');
        pulsante.disabled = false;
        if (!esito) return true;
        generale.innerHTML = String(html`<span class="material-symbols-rounded" aria-hidden="true">error</span><div>${esito.message || 'Salvataggio non riuscito'}</div>`);
        generale.hidden = false;
        generale.scrollIntoView({ block: 'nearest' });
        return false;
    }
}
