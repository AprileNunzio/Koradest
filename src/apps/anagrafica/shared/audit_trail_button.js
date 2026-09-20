import { esc } from '../../../js/shared/html.js';
import { icona3d } from '../../../js/shared/tinte.js';

const EVENTI = {
    INSERT: { etichetta: 'Creazione', classe: 'creazione' },
    UPDATE: { etichetta: 'Modifica', classe: 'modifica' },
    DELETE: { etichetta: 'Eliminazione', classe: 'eliminazione' }
};

const descrivi = (tipo) => EVENTI[tipo] || { etichetta: String(tipo || 'Evento'), classe: 'modifica' };

const valore = (contenuto) => (contenuto === null || contenuto === undefined || contenuto === '' ? '—' : esc(contenuto));

export function mountAuditButton(container, { tableName, recordId, label }) {
    if (!container) return;
    container.innerHTML = `
        <button type="button" class="btn-icon-action audit-trail-btn" title="Storico revisioni" aria-label="Storico revisioni" aria-expanded="false">
            <span class="material-symbols-rounded">history</span>
        </button>
        <div class="audit-pannello" hidden></div>
    `;

    const tasto = container.querySelector('.audit-trail-btn');
    const pannello = container.querySelector('.audit-pannello');
    let caricato = false;

    const chiudi = () => {
        pannello.hidden = true;
        tasto.setAttribute('aria-expanded', 'false');
    };

    tasto.addEventListener('click', async (evento) => {
        evento.stopPropagation();
        if (!pannello.hidden) {
            chiudi();
            return;
        }
        pannello.hidden = false;
        tasto.setAttribute('aria-expanded', 'true');
        if (caricato) return;
        pannello.innerHTML = `
            <div class="audit-pannello-testa">
                <span class="audit-pannello-titolo">Storico revisioni${label ? ` — ${esc(label)}` : ''}</span>
                <button type="button" class="ak-iconbtn audit-pannello-chiudi" aria-label="Chiudi"><span class="material-symbols-rounded">close</span></button>
            </div>
            <div class="audit-pannello-corpo"><div class="k-loading"><div class="k-spinner"></div><span>Lettura del registro…</span></div></div>
        `;
        pannello.querySelector('.audit-pannello-chiudi').addEventListener('click', chiudi);
        const corpo = pannello.querySelector('.audit-pannello-corpo');
        try {
            const revisioni = await window.electronAPI.anagrafica.audit.getHistory({ tableName, recordId });
            caricato = true;
            if (!revisioni || revisioni.length === 0) {
                corpo.innerHTML = `
                    <div class="ak-empty">
                        ${icona3d('history_toggle_off', { dimensione: 'md', varianti: ['tenue'] })}
                        <h4>Nessuna revisione</h4>
                        <p>Per questo elemento il registro non contiene ancora modifiche.</p>
                    </div>`;
                return;
            }
            corpo.innerHTML = revisioni.map(revisione => {
                const evento = descrivi(revisione.eventType);
                const cambi = Array.isArray(revisione.changes) ? revisione.changes : [];
                return `
                    <article class="scheda-record scheda-record--${evento.classe}">
                        <div class="scheda-record-title">
                            <span class="audit-event-badge audit-event-badge--${evento.classe}">${esc(evento.etichetta)}</span>
                            ${esc(revisione.actorName || 'Autore non registrato')}
                        </div>
                        <div class="scheda-record-sub">${esc(new Date(revisione.timestamp).toLocaleString('it-IT'))}</div>
                        ${cambi.length > 0 ? `<div class="scheda-record-cambi">${cambi.map(cambio => `
                            <div><strong>${esc(cambio.field)}</strong>: <span class="scheda-record-prima">${valore(cambio.oldValue)}</span> &rarr; <span class="scheda-record-dopo">${valore(cambio.newValue)}</span></div>
                        `).join('')}</div>` : ''}
                    </article>`;
            }).join('');
        } catch (e) {
            corpo.innerHTML = `
                <div class="ak-empty">
                    ${icona3d('error', { dimensione: 'md', varianti: ['errore'] })}
                    <h4>Registro non leggibile</h4>
                    <p>${esc(e.message || 'Errore sconosciuto.')}</p>
                </div>`;
        }
    });
}
