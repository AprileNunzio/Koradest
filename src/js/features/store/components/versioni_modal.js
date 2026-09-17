import { toast } from '../../../utils.js';

function pesoLeggibile(byte) {
    const valore = Number(byte) || 0;
    if (valore <= 0) return '-';
    if (valore < 1024 * 1024) return `${Math.round(valore / 1024)} KB`;
    return `${(valore / (1024 * 1024)).toFixed(1)} MB`;
}

function istante(secondi) {
    try {
        const ms = Number(secondi) < 10000000000 ? Number(secondi) * 1000 : Number(secondi);
        return new Date(ms).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (errore) {
        return '-';
    }
}

function riga(voce) {
    const snapBadge = voce.hasSnapshot ? '<span class="badge badge-info" style="font-size:0.75rem; margin-left:0.5rem;">Snapshot DB Presente</span>' : '';
    const stato = voce.attuale
        ? '<span class="versione-attuale">In uso</span>'
        : `<div style="display:flex; gap:0.5rem;">
               <button type="button" class="versione-installa btn btn-secondary btn-sm" data-versione="${voce.version}">
                   <span class="material-symbols-rounded">history</span>Installa
               </button>
               ${voce.hasSnapshot ? `<button type="button" class="versione-rollback btn btn-warning btn-sm" data-versione="${voce.version}">
                   <span class="material-symbols-rounded">restore</span>Rollback
               </button>` : ''}
           </div>`;

    return `
        <li class="versione-riga" data-attuale="${voce.attuale ? 'true' : 'false'}">
            <div class="versione-info">
                <div style="display:flex; align-items:center;">
                    <strong>v${voce.version}</strong>
                    ${snapBadge}
                </div>
                <span class="versione-meta">${istante(voce.scaricato_il)} &middot; ${pesoLeggibile(voce.dimensione)}</span>
                <code class="versione-hash" title="${voce.sha256 || ''}">${(voce.sha256 || '').slice(0, 16)}</code>
            </div>
            <div>${stato}</div>
        </li>`;
}

function scheletro(app, dati) {
    const voci = dati.versioni || [];
    const corpo = voci.length === 0
        ? `<p class="versione-vuoto">Nessun pacchetto conservato: verra archiviato al prossimo aggiornamento.</p>`
        : `<ul class="versione-elenco">${voci.map(riga).join('')}</ul>`;

    return `
        <div class="store-modal versioni-modal">
            <header class="versioni-testa">
                <span class="material-symbols-rounded">inventory_2</span>
                <div>
                    <h2>Versioni di ${app.name || app.id}</h2>
                    <p>Vengono conservati gli ultimi ${dati.conservate} pacchetti scaricati.
                    Puoi tornare a una versione precedente senza scaricarla di nuovo.</p>
                </div>
            </header>
            <div class="versioni-corpo">${corpo}</div>
            <footer class="versioni-piede">
                <button type="button" class="btn-header-secondary" id="versioni-chiudi">Chiudi</button>
            </footer>
        </div>`;
}

export async function apriVersioni(app, onInstalla) {
    try {
        const api = window.electronAPI && window.electronAPI.store;
        if (!api || typeof api.elencaVersioni !== 'function') {
            toast('Archivio versioni non disponibile', 'error');
            return;
        }

        const esito = await api.elencaVersioni(app.id);
        if (!esito || esito.success !== true) {
            toast((esito && esito.error) || 'Impossibile leggere le versioni', 'error');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'store-modal-overlay';
        overlay.innerHTML = scheletro(app, esito.data);

        const chiudi = () => overlay.remove();
        overlay.querySelector('#versioni-chiudi').addEventListener('click', chiudi);
        overlay.addEventListener('click', evento => {
            if (evento.target === overlay) chiudi();
        });

        overlay.querySelectorAll('.versione-installa').forEach(bottone => {
            bottone.addEventListener('click', async () => {
                const versione = bottone.dataset.versione;
                chiudi();
                await onInstalla(app.id, versione);
            });
        });

        overlay.querySelectorAll('.versione-rollback').forEach(bottone => {
            bottone.addEventListener('click', async () => {
                const versione = bottone.dataset.versione;
                chiudi();
                toast(`Rollback a v${versione} in corso...`, 'info');
                try {
                    const res = await api.rollbackAppVersion({ appId: app.id, targetVersion: versione });
                    if (res && res.success) {
                        toast(`Rollback a v${versione} completato con successo!`, 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        toast((res && res.error) || 'Errore durante il rollback', 'error');
                    }
                } catch (rErr) {
                    toast(rErr.message || 'Errore di rollback', 'error');
                }
            });
        });


        document.body.appendChild(overlay);
    } catch (errore) {
        toast(errore.message || 'Errore', 'error');
    }
}
