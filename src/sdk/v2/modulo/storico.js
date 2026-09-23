import { richiesta } from '../ponte.js';
import { html, formato } from '../utilita.js';

const AZIONI = {
    INSERT: { etichetta: 'Inserimento', icona: 'add_circle', tono: 'success' },
    UPDATE: { etichetta: 'Modifica', icona: 'edit', tono: 'primary' },
    DELETE: { etichetta: 'Eliminazione', icona: 'delete', tono: 'error' }
};

const etichettaOpzione = (campo, valore) => {
    const opzione = (campo.opzioni || []).map(voce => (typeof voce === 'object' ? voce : { valore: voce, etichetta: voce }))
        .find(voce => String(voce.valore) === String(valore));
    return opzione ? opzione.etichetta : null;
};

const descrivi = (valore, campo = {}) => {
    if (valore === null || valore === undefined || valore === '') return '—';
    if (campo.tipo === 'checkbox' || typeof valore === 'boolean') return valore === true || valore === 1 || valore === '1' ? 'Sì' : 'No';
    if (campo.tipo === 'select') return etichettaOpzione(campo, valore) || String(valore);
    if (campo.tipo === 'euro' || campo.tipo === 'numero') {
        const numero = Number(valore) / (campo.archivio === 'centesimi' ? 100 : 1);
        return campo.tipo === 'euro' ? formato.euro(numero) : formato.numero(numero, campo.decimali || 0);
    }
    if (campo.tipo === 'data') return formato.data(valore) || String(valore);
    return typeof valore === 'object' ? JSON.stringify(valore) : String(valore);
};

function voce(elemento, campo) {
    const azione = AZIONI[elemento.azione] || AZIONI.UPDATE;
    const valori = elemento.campo === '*'
        ? html`<p class="k-storico-valori">Il record è stato eliminato.</p>`
        : html`
            <p class="k-storico-valori">
                ${elemento.azione === 'INSERT' ? '' : html`<del class="k-storico-prima">${descrivi(elemento.prima, campo)}</del><span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span>`}
                <ins class="k-storico-dopo">${descrivi(elemento.dopo, campo)}</ins>
            </p>`;
    return html`
        <li class="k-storico-voce" data-tono="${azione.tono}">
            <span class="k-storico-icona material-symbols-rounded" aria-hidden="true">${azione.icona}</span>
            <div class="k-storico-testo">
                <div class="k-storico-meta"><strong>${azione.etichetta}</strong><span>${formato.dataOra(elemento.dataOra)}</span><span>${elemento.operatore}</span></div>
                ${valori}
            </div>
        </li>`;
}

function corpo(voci, campo) {
    if (voci.length === 0) return html`<p class="k-muted">Nessuna modifica registrata per questo campo.</p>`;
    return html`<ol class="k-storico-elenco">${voci.map(elemento => voce(elemento, campo))}</ol>`;
}

function crea(etichetta) {
    const sfondo = document.createElement('div');
    sfondo.className = 'k-dialog-backdrop k-storico';
    sfondo.innerHTML = String(html`
        <section class="k-dialog k-dialog--lg" role="dialog" aria-modal="true" aria-labelledby="k-storico-titolo">
            <header class="k-dialog-header">
                <span class="material-symbols-rounded k-storico-titolo-icona" aria-hidden="true">history</span>
                <div class="k-storico-titoli">
                    <h2 class="k-dialog-title" id="k-storico-titolo">Storico delle modifiche</h2>
                    <span class="k-muted k-truncate">${etichetta}</span>
                </div>
                <button type="button" class="k-btn k-btn--ghost k-btn--icon" data-chiudi aria-label="Chiudi"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>
            </header>
            <div class="k-dialog-body" data-corpo><k-caricamento></k-caricamento></div>
            <footer class="k-dialog-footer k-storico-piede"><span class="material-symbols-rounded" aria-hidden="true">verified_user</span><span>Registro immutabile con catena di impronte SHA-256</span></footer>
        </section>`);
    return sfondo;
}

export async function apriStorico({ tabella, id, campo }) {
    const precedente = document.activeElement;
    const sfondo = crea(campo.etichetta);
    const chiudi = () => {
        sfondo.remove();
        document.removeEventListener('keydown', suTasto);
        if (precedente && typeof precedente.focus === 'function') precedente.focus();
    };
    const suTasto = (evento) => {
        if (evento.key === 'Escape') chiudi();
    };
    sfondo.addEventListener('click', (evento) => {
        if (evento.target === sfondo || evento.target.closest('[data-chiudi]')) chiudi();
    });
    document.addEventListener('keydown', suTasto);
    document.body.appendChild(sfondo);
    sfondo.querySelector('[data-chiudi]').focus();

    const destinazione = sfondo.querySelector('[data-corpo]');
    const voci = await richiesta('chiama', { azione: 'koradest.storico', payload: { tabella, id, campo: campo.nome } }).catch((errore) => {
        destinazione.innerHTML = String(html`<div class="k-alert k-alert--danger"><span class="material-symbols-rounded" aria-hidden="true">error</span><div>${errore.message}</div></div>`);
        return null;
    });
    if (voci) destinazione.innerHTML = String(corpo(voci, campo));
}
