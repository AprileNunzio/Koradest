import { esc } from '../../../js/shared/html.js';
import { icona3d } from '../../../js/shared/tinte.js';

const EVENTI = {
    INSERT: { etichetta: 'Creazione', classe: 'creazione' },
    UPDATE: { etichetta: 'Modifica', classe: 'modifica' },
    DELETE: { etichetta: 'Eliminazione', classe: 'eliminazione' }
};

const ID_FINESTRA = 'audit-trail-modal';

const descrivi = (tipo) => EVENTI[tipo] || { etichetta: String(tipo || 'Evento'), classe: 'modifica' };

const valore = (contenuto) => (contenuto === null || contenuto === undefined || contenuto === '' ? '—' : esc(contenuto));

export function mountAuditButton(container, { tableName, recordId, label }) {
    if (!container) return;
    container.innerHTML = `
        <button type="button" class="btn-icon-action audit-trail-btn" title="Storico revisioni" aria-label="Storico revisioni">
            <span class="material-symbols-rounded">history</span>
        </button>
    `;
    container.querySelector('.audit-trail-btn').addEventListener('click', async (evento) => {
        evento.stopPropagation();
        await apriStorico(tableName, recordId, label);
    });
}

async function apriStorico(tableName, recordId, label) {
    let finestra = document.getElementById(ID_FINESTRA);
    if (!finestra) {
        finestra = document.createElement('div');
        finestra.id = ID_FINESTRA;
        finestra.className = 'ak-modal';
        finestra.dataset.aperta = 'no';
        finestra.setAttribute('role', 'dialog');
        finestra.setAttribute('aria-modal', 'true');
        document.body.appendChild(finestra);
    }

    finestra.dataset.zona = 'sistema';
    finestra.innerHTML = `
        <div class="ak-modal-card ak-modal-card--stretta">
            <div class="ak-modal-head">
                <h3><span class="material-symbols-rounded">history</span><span>Storico revisioni${label ? ` — ${esc(label)}` : ''}</span></h3>
                <button type="button" id="audit-trail-close" class="ak-iconbtn" aria-label="Chiudi finestra"><span class="material-symbols-rounded">close</span></button>
            </div>
            <div class="ak-modal-body ak-modal-body--scorrevole" id="audit-trail-content">
                <div class="k-loading"><div class="k-spinner"></div><span>Lettura del registro…</span></div>
            </div>
        </div>
    `;

    finestra.dataset.aperta = 'si';
    requestAnimationFrame(() => {
        finestra.style.opacity = '1';
        finestra.querySelector('.ak-modal-card').style.transform = 'none';
    });

    const chiudi = () => {
        finestra.style.opacity = '0';
        const scheda = finestra.querySelector('.ak-modal-card');
        if (scheda) scheda.style.transform = 'translateY(8px) scale(0.98)';
        setTimeout(() => { finestra.dataset.aperta = 'no'; }, 220);
    };
    finestra.querySelector('#audit-trail-close').addEventListener('click', chiudi);
    finestra.addEventListener('click', (evento) => { if (evento.target === finestra) chiudi(); });

    const contenuto = finestra.querySelector('#audit-trail-content');
    try {
        const revisioni = await window.electronAPI.anagrafica.audit.getHistory({ tableName, recordId });
        if (!revisioni || revisioni.length === 0) {
            contenuto.innerHTML = `
                <div class="ak-empty">
                    ${icona3d('history_toggle_off', { dimensione: 'lg', varianti: ['tenue'] })}
                    <h4>Nessuna revisione</h4>
                    <p>Per questo elemento il registro non contiene ancora modifiche.</p>
                </div>`;
            return;
        }
        contenuto.innerHTML = revisioni.map(revisione => {
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
        contenuto.innerHTML = `
            <div class="ak-empty">
                ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                <h4>Registro non leggibile</h4>
                <p>${esc(e.message || 'Errore sconosciuto.')}</p>
            </div>`;
    }
}
