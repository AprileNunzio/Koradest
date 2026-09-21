import { html, formato, esc } from './utilita.js';
import koradest from './koradest.js';

const definisci = (nome, classe) => {
    if (!customElements.get(nome)) customElements.define(nome, classe);
};

export class KCampoLive extends HTMLElement {
    constructor() {
        super();
        this._inizializzato = false;
        this._salvando = false;
        this._valoreIniziale = null;
        
        this.salva = this.salva.bind(this);
        this.mostraAudit = this.mostraAudit.bind(this);
    }

    connectedCallback() {
        if (!this._inizializzato) {
            this.render();
            this._inizializzato = true;
        }
    }

    render() {
        const tipo = this.getAttribute('tipo') || 'text';
        const nome = this.getAttribute('nome') || '';
        const valore = this.getAttribute('valore') || '';
        const opzioni = this.getAttribute('opzioni') ? JSON.parse(this.getAttribute('opzioni')) : [];
        const required = this.hasAttribute('required') ? 'required' : '';
        const etichetta = this.getAttribute('etichetta') || '';

        this._valoreIniziale = valore;
        this.innerHTML = `
            <div class="k-campo-live-container">
                <div class="k-campo-live-input-wrapper">
                    ${this.creaInput(tipo, nome, valore, opzioni, required)}
                    <button type="button" class="k-campo-live-audit-btn" title="Vedi storico modifiche" tabindex="-1">
                        <span class="material-symbols-rounded">history</span>
                    </button>
                </div>
                <div class="k-campo-live-messaggio"></div>
            </div>
        `;

        this.input = this.querySelector('.k-campo-live-input');
        this.auditBtn = this.querySelector('.k-campo-live-audit-btn');
        this.messaggio = this.querySelector('.k-campo-live-messaggio');

        if (this.input) {
            this.input.addEventListener('blur', this.salva);
            if (tipo === 'select') {
                this.input.addEventListener('change', this.salva);
            }
        }
        
        if (this.auditBtn) {
            this.auditBtn.addEventListener('click', this.mostraAudit);
        }
    }

    creaInput(tipo, nome, valore, opzioni, required) {
        if (tipo === 'select') {
            return `
                <select class="k-input k-campo-live-input" name="${esc(nome)}" ${required}>
                    ${opzioni.map(o => {
                        const optVal = o.id || o.valore || o;
                        const optLabel = o.titolo || o.etichetta || o;
                        return `<option value="${esc(optVal)}" ${optVal == valore ? 'selected' : ''}>${esc(optLabel)}</option>`;
                    }).join('')}
                </select>
            `;
        }
        if (tipo === 'textarea') {
            return `<textarea class="k-input k-campo-live-input" name="${esc(nome)}" ${required}>${esc(valore)}</textarea>`;
        }
        return `<input type="${esc(tipo)}" class="k-input k-campo-live-input" name="${esc(nome)}" value="${esc(valore)}" ${required}>`;
    }

    async salva() {
        if (this._salvando) return;
        const nuovoValore = this.input.value;
        if (nuovoValore === this._valoreIniziale) {
            this.rimuoviStati();
            return; 
        }

        this._salvando = true;
        this.rimuoviStati();
        this.input.classList.add('k-live-saving');
        
        const azione = this.getAttribute('azione');
        const recordId = this.getAttribute('record-id');
        const nomeCampo = this.getAttribute('nome');

        if (!azione || !recordId) {
            this.impostaErrore("Configurazione campo mancante (azione o record-id)");
            this._salvando = false;
            return;
        }

        const payload = {
            id: recordId,
            [nomeCampo]: nuovoValore
        };

        try {
            const extraPayload = this.getAttribute('extra-payload');
            if (extraPayload) {
                Object.assign(payload, JSON.parse(extraPayload));
            }

            await koradest.chiama(azione, payload);
            
            this._valoreIniziale = nuovoValore;
            this.impostaSuccesso();
            
            
            this.dispatchEvent(new CustomEvent('k-salvato', { 
                bubbles: true, 
                detail: { campo: nomeCampo, valore: nuovoValore } 
            }));
            
        } catch (errore) {
            this.impostaErrore(errore.message || "Errore durante il salvataggio");
            
            
        } finally {
            this.input.classList.remove('k-live-saving');
            this._salvando = false;
        }
    }

    rimuoviStati() {
        this.input.classList.remove('k-live-success', 'k-live-error');
        this.messaggio.textContent = '';
        this.messaggio.className = 'k-campo-live-messaggio';
    }

    impostaSuccesso() {
        this.rimuoviStati();
        this.input.classList.add('k-live-success');
        
        setTimeout(() => this.input.classList.remove('k-live-success'), 3000);
    }

    impostaErrore(testo) {
        this.rimuoviStati();
        this.input.classList.add('k-live-error');
        this.messaggio.textContent = testo;
        this.messaggio.classList.add('visibile');
    }

    async mostraAudit() {
        const tabella = this.getAttribute('tabella');
        const recordId = this.getAttribute('record-id');
        const nomeCampo = this.getAttribute('nome');
        const etichetta = this.getAttribute('etichetta') || nomeCampo;

        if (!tabella || !recordId) {
            koradest.ui.errore("Impossibile recuperare l'audit per questo campo.");
            return;
        }

        try {
            const audit = await koradest.chiama('audit.leggi_campo', {
                tabella, record_id: recordId, campo: nomeCampo
            });

            if (!audit || audit.length === 0) {
                koradest.ui.avviso({
                    titolo: 'Nessuna modifica',
                    testo: \`Il campo "\${etichetta}" non ha registrato modifiche.\`,
                    etichetta: 'Chiudi'
                });
                return;
            }

            
            const modale = document.createElement('dialog');
            modale.className = 'k-dialog';
            modale.innerHTML = \`
                <div class="k-dialog-box" style="width: 500px; max-width: 90vw;">
                    <div class="k-dialog-header">
                        <h2>Storico modifiche: \${esc(etichetta)}</h2>
                        <button type="button" class="k-btn-icon k-dialog-close"><span class="material-symbols-rounded">close</span></button>
                    </div>
                    <div class="k-dialog-body k-stack" style="max-height: 50vh; overflow-y: auto;">
                        <table class="k-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Operatore</th>
                                    <th>Valore precedente</th>
                                    <th>Nuovo valore</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${audit.map(a => \`
                                    <tr>
                                        <td class="k-color-light">\${formato.dataOra(a.data_ora)}</td>
                                        <td><strong>\${esc(a.operatore || 'Sconosciuto')}</strong></td>
                                        <td><div class="k-truncate" style="max-width: 120px;" title="\${esc(a.vecchio_valore)}">\${esc(a.vecchio_valore || '-')}</div></td>
                                        <td><div class="k-truncate" style="max-width: 120px;" title="\${esc(a.nuovo_valore)}">\${esc(a.nuovo_valore || '-')}</div></td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            \`;

            document.body.appendChild(modale);
            modale.showModal();

            const chiudi = () => {
                modale.close();
                modale.remove();
            };
            modale.querySelector('.k-dialog-close').addEventListener('click', chiudi);
            modale.addEventListener('click', (e) => {
                if (e.target === modale) chiudi();
            });

        } catch (errore) {
            koradest.ui.errore("Errore lettura audit: " + errore.message);
        }
    }
}

definisci('k-campo-live', KCampoLive);
