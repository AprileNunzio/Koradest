import { toast } from '../../../utils.js';

const CONFERMA = 'ELIMINA';

function riga(voce) {
    return `
        <li class="purge-voce">
            <span class="material-symbols-rounded">delete_forever</span>
            <div>
                <strong>${voce.etichetta}</strong>
                <span class="purge-percorso" title="${voce.percorso}">${voce.percorso}</span>
            </div>
        </li>`;
}

function scheletro(app, voci, archivio) {
    return `
        <div class="store-modal purge-modal">
            <header class="purge-testa">
                <span class="material-symbols-rounded purge-allarme">warning</span>
                <div>
                    <h2>Disinstallare ${app.name || app.id}?</h2>
                    <p>Questa operazione cancella <strong>tutto</strong> quello che appartiene all'applicazione.
                    Alla prossima installazione ripartirai da zero.</p>
                </div>
            </header>

            <div class="purge-corpo">
                <p class="purge-eti">Verranno eliminati definitivamente ${voci.length} elementi:</p>
                <ul class="purge-elenco">${voci.map(riga).join('')}</ul>
                <p class="purge-nota">
                    <span class="material-symbols-rounded">database</span>
                    L'archivio <code>${archivio}</code> contiene i dati inseriti dagli utenti in questa applicazione.
                    Una volta cancellato non e recuperabile, se non da un tuo backup.
                </p>
                <label class="purge-conferma">
                    <span>Per procedere scrivi <strong>${CONFERMA}</strong></span>
                    <input type="text" id="purge-input" class="input" autocomplete="off" spellcheck="false" placeholder="${CONFERMA}">
                </label>
            </div>

            <footer class="purge-piede">
                <button type="button" class="btn-header-secondary" id="purge-annulla">Annulla</button>
                <button type="button" class="purge-conferma-btn" id="purge-procedi" disabled>
                    <span class="material-symbols-rounded">delete_forever</span>Elimina tutto
                </button>
            </footer>
        </div>`;
}

export async function apriDisinstallazione(app, onConfermato) {
    try {
        const api = window.electronAPI && window.electronAPI.store;
        if (!api || typeof api.anteprimaDisinstallazione !== 'function') {
            toast('Anteprima disinstallazione non disponibile', 'error');
            return;
        }

        const esito = await api.anteprimaDisinstallazione(app.id);
        if (!esito || esito.success !== true) {
            toast((esito && esito.error) || 'Impossibile leggere i dati da eliminare', 'error');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'store-modal-overlay';
        overlay.innerHTML = scheletro(app, esito.data.voci || [], esito.data.archivio || '');

        const chiudi = () => overlay.remove();
        const campo = overlay.querySelector('#purge-input');
        const procedi = overlay.querySelector('#purge-procedi');

        campo.addEventListener('input', () => {
            procedi.disabled = campo.value.trim().toUpperCase() !== CONFERMA;
        });

        overlay.querySelector('#purge-annulla').addEventListener('click', chiudi);
        overlay.addEventListener('click', evento => {
            if (evento.target === overlay) chiudi();
        });

        procedi.addEventListener('click', async () => {
            procedi.disabled = true;
            procedi.textContent = 'Eliminazione in corso...';
            chiudi();
            await onConfermato(app.id);
        });

        document.body.appendChild(overlay);
        campo.focus();
    } catch (errore) {
        toast(errore.message || 'Errore', 'error');
    }
}
