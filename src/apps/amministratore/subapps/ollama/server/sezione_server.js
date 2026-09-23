import { esc, scheda, campo, mostraEsito } from '../comune/ui.js';

const INDIRIZZO = /^https?:\/\/[A-Za-z0-9.\-\[\]:]+(:\d{1,5})?\/?$/;

export function montaServer(contenitore, { ollama, configurazioneOllama }) {
    contenitore.innerHTML = scheda('dns', 'Server Ollama', 'Dove gira il modello: questo computer o un server della rete scolastica o aziendale.', `
        <div class="k-form-grid">
            ${campo('ollama-host', 'Indirizzo del server', `<input type="url" id="ollama-host" class="k-input" value="${esc(configurazioneOllama.host || 'http://127.0.0.1:11434')}" placeholder="http://127.0.0.1:11434" autocomplete="off" spellcheck="false">`, 'Esempio per un server di rete: http://192.168.1.150:11434', true)}
        </div>
        <div class="k-row">
            <button type="button" class="k-btn" data-prova-server><span class="material-symbols-rounded" aria-hidden="true">speed</span>Prova questo indirizzo</button>
        </div>
        <div class="k-alert" data-esito-server hidden></div>`);

    const host = contenitore.querySelector('#ollama-host');
    const esito = contenitore.querySelector('[data-esito-server]');

    contenitore.querySelector('[data-prova-server]').addEventListener('click', async (evento) => {
        const indirizzo = host.value.trim();
        if (!INDIRIZZO.test(indirizzo)) {
            mostraEsito(esito, 'danger', 'Indirizzo non valido: usa http://nome-o-ip:porta');
            return;
        }
        evento.currentTarget.disabled = true;
        mostraEsito(esito, 'info', 'Verifica in corso…');
        const risposta = await ollama.testConnection({ host: indirizzo });
        evento.currentTarget.disabled = false;
        mostraEsito(esito, risposta.available ? 'success' : 'danger', risposta.available
            ? `Raggiungibile in ${risposta.latencyMs} ms · ${risposta.models.length} modelli installati`
            : `Non raggiungibile: ${risposta.error || 'nessuna risposta'}`);
    });

    return {
        valida: () => (INDIRIZZO.test(host.value.trim()) ? null : 'L\'indirizzo del server Ollama non è valido'),
        valori: () => ({ ollama: { host: host.value.trim() } })
    };
}
