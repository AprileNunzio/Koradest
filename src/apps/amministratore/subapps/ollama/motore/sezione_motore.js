import { toast } from '../../../../../js/utils.js';
import { esc, opzioni, scheda, campo, mostraEsito } from '../comune/ui.js';

const ETICHETTE = { ollama: 'Ollama (server locale o di rete)', gemini: 'Google Gemini (cloud, chiave API)' };

const statoChiave = descrizione => (descrizione && descrizione.configurata
    ? `<span class="k-badge k-badge--success">Configurata ••••${esc(descrizione.finale)}</span>`
    : '<span class="k-badge k-badge--warning">Nessuna chiave</span>');

const opzioniModelli = (modelli, selezionato) => opzioni((modelli.includes(selezionato) || !selezionato ? modelli : [selezionato, ...modelli]).map(nome => ({ valore: nome, etichetta: nome })), selezionato);

function markup(configurazione) {
    return scheda('hub', 'Motore', 'Il fornitore e il modello che Jarvis e gli agenti usano per tutte le applicazioni.', `
        <div class="k-form-grid">
            ${campo('ai-fornitore', 'Fornitore', `<select id="ai-fornitore" class="k-select">${opzioni(configurazione.fornitoriDisponibili.map(nome => ({ valore: nome, etichetta: ETICHETTE[nome] || nome })), configurazione.fornitore)}</select>`)}
            ${campo('ai-modello', 'Modello', `
                <div class="k-row" style="--k-gap: var(--k-space-2); flex-wrap: nowrap;">
                    <select id="ai-modello" class="k-select" style="flex: 1; min-width: 0;"></select>
                    <button type="button" class="k-btn k-btn--icon" data-ricarica-modelli aria-label="Aggiorna l'elenco dei modelli" title="Aggiorna l'elenco dei modelli"><span class="material-symbols-rounded" aria-hidden="true">refresh</span></button>
                </div>`)}
        </div>
        <div class="k-stack" data-sezione-chiave hidden>
            <div class="k-alert k-alert--warning">
                <span class="material-symbols-rounded" aria-hidden="true">cloud_upload</span>
                <div>Con un fornitore cloud le richieste e i risultati degli strumenti escono dalla rete. Codici fiscali, IBAN e credenziali vengono mascherati prima dell'invio; nomi e indirizzi no. Valuta la DPIA prima di usarlo su dati di minori.</div>
            </div>
            <div class="k-field">
                <span class="k-label">Chiave API <span data-stato-chiave></span></span>
                <div class="k-row" style="--k-gap: var(--k-space-2);">
                    <input id="ai-chiave" class="k-input" type="password" autocomplete="off" spellcheck="false" placeholder="Incolla la nuova chiave" aria-label="Nuova chiave API" style="flex: 1 1 16rem; min-width: 0;">
                    <button type="button" class="k-btn" data-salva-chiave><span class="material-symbols-rounded" aria-hidden="true">key</span>Salva chiave</button>
                    <button type="button" class="k-btn k-btn--ghost" data-rimuovi-chiave><span class="material-symbols-rounded" aria-hidden="true">key_off</span>Rimuovi</button>
                </div>
                <span class="k-hint">Cifrata con il portachiavi del sistema operativo: non torna mai all'interfaccia.</span>
            </div>
        </div>
        <div class="k-alert" data-esito-motore hidden></div>`);
}

export async function montaMotore(contenitore, { api, configurazione }) {
    contenitore.innerHTML = markup(configurazione);
    const stato = { configurazione, fornitore: configurazione.fornitore };
    const esito = contenitore.querySelector('[data-esito-motore]');
    const selettoreModello = contenitore.querySelector('#ai-modello');

    const aggiornaChiave = () => {
        const richiede = stato.fornitore !== 'ollama';
        contenitore.querySelector('[data-sezione-chiave]').hidden = !richiede;
        if (richiede) contenitore.querySelector('[data-stato-chiave]').innerHTML = statoChiave(stato.configurazione.chiavi[stato.fornitore]);
    };
    const caricaModelli = async () => {
        const selezionato = stato.configurazione.modelli[stato.fornitore];
        selettoreModello.innerHTML = opzioniModelli([], selezionato);
        const risposta = await api.listModels({ fornitore: stato.fornitore });
        if (!risposta.success) {
            mostraEsito(esito, 'warning', `Elenco dei modelli non disponibile: ${risposta.error}`);
            return;
        }
        esito.hidden = true;
        selettoreModello.innerHTML = opzioniModelli(risposta.data, selezionato);
    };
    const ricarica = async () => {
        const risposta = await api.getConfig();
        if (!risposta.success) throw new Error(risposta.error);
        stato.configurazione = risposta.data;
        aggiornaChiave();
    };
    const gestisciChiave = async (operazione, messaggio) => {
        const risposta = await operazione();
        if (!risposta.success) {
            mostraEsito(esito, 'danger', risposta.error);
            return;
        }
        await ricarica();
        toast(messaggio, 'success');
        await caricaModelli();
    };

    contenitore.querySelector('#ai-fornitore').addEventListener('change', (evento) => {
        stato.fornitore = evento.target.value;
        aggiornaChiave();
        caricaModelli();
    });
    contenitore.querySelector('[data-ricarica-modelli]').addEventListener('click', caricaModelli);
    contenitore.querySelector('[data-salva-chiave]').addEventListener('click', () => {
        const campoChiave = contenitore.querySelector('#ai-chiave');
        const chiave = campoChiave.value;
        campoChiave.value = '';
        return gestisciChiave(() => api.saveApiKey({ fornitore: stato.fornitore, chiave }), 'Chiave API salvata e cifrata');
    });
    contenitore.querySelector('[data-rimuovi-chiave]').addEventListener('click', () => gestisciChiave(() => api.removeApiKey({ fornitore: stato.fornitore }), 'Chiave API rimossa'));

    aggiornaChiave();
    await caricaModelli();
    return {
        valori: () => ({
            ai: { fornitore: stato.fornitore, modelli: { [stato.fornitore]: selettoreModello.value } },
            ollama: stato.fornitore === 'ollama' && selettoreModello.value ? { defaultModel: selettoreModello.value } : {}
        })
    };
}
