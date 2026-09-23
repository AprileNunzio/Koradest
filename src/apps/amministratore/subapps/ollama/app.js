import { toast } from '../../../../js/utils.js';
import { montaStato } from './stato/sezione_stato.js';
import { montaMotore } from './motore/sezione_motore.js';
import { montaServer } from './server/sezione_server.js';
import { montaJarvis } from './jarvis/sezione_jarvis.js';
import { montaMemoria, montaRagionamento } from './comportamento/sezione_comportamento.js';
import { montaStrumenti } from './strumenti/sezione_strumenti.js';
import { montaProva } from './prova/sezione_prova.js';

const SCHELETRO = `
    <div class="k-page fade-in-up">
        <header class="k-page-header">
            <div class="k-page-heading">
                <span class="k-page-icon material-symbols-rounded" aria-hidden="true">psychology</span>
                <div>
                    <h1 class="k-page-title">Intelligenza artificiale</h1>
                    <p class="k-page-subtitle">Motore, server Ollama, Jarvis, memoria del modello, ragionamento e strumenti delle applicazioni</p>
                </div>
            </div>
            <div class="k-page-actions">
                <button type="button" class="k-btn k-btn--primary" data-salva-tutto><span class="material-symbols-rounded" aria-hidden="true">save</span>Salva</button>
            </div>
        </header>
        <div data-stato></div>
        <div class="k-grid k-grid--lg" style="align-items: start;">
            <div data-motore></div>
            <div data-server></div>
            <div data-jarvis></div>
            <div data-memoria></div>
            <div data-ragionamento></div>
            <div data-prova></div>
        </div>
        <div data-strumenti></div>
    </div>`;

function unisci(sezioni) {
    return sezioni.map(sezione => sezione.valori()).reduce((totale, parziale) => ({
        ai: { ...totale.ai, ...(parziale.ai || {}), modelli: { ...(totale.ai.modelli || {}), ...((parziale.ai && parziale.ai.modelli) || {}) } },
        ollama: { ...totale.ollama, ...(parziale.ollama || {}) }
    }), { ai: {}, ollama: {} });
}

async function carica(api, ollama) {
    const [configurazione, configurazioneOllama] = await Promise.all([api.getConfig(), ollama.getConfig()]);
    if (!configurazione.success) throw new Error(configurazione.error);
    if (!configurazioneOllama.success) throw new Error(configurazioneOllama.error);
    return { configurazione: configurazione.data, configurazioneOllama: configurazioneOllama.data };
}

export default {
    render: async (el) => {
        const api = window.electronAPI.ai;
        const ollama = window.electronAPI.ollama;
        el.innerHTML = SCHELETRO;
        const parte = selettore => el.querySelector(selettore);
        const contesto = { api, ollama, ...(await carica(api, ollama)) };

        const strumenti = await montaStrumenti(parte('[data-strumenti]'), contesto);
        const sezioni = [
            await montaMotore(parte('[data-motore]'), contesto),
            montaServer(parte('[data-server]'), contesto),
            montaJarvis(parte('[data-jarvis]'), contesto),
            montaMemoria(parte('[data-memoria]'), contesto),
            montaRagionamento(parte('[data-ragionamento]'), contesto),
            montaProva(parte('[data-prova]'), contesto),
            strumenti
        ];
        const aggiornaStato = configurazione => montaStato(parte('[data-stato]'), { api, configurazione, strumenti: strumenti.totale });
        aggiornaStato(contesto.configurazione);

        parte('[data-salva-tutto]').addEventListener('click', async (evento) => {
            const errore = sezioni.map(sezione => (typeof sezione.valida === 'function' ? sezione.valida() : null)).find(Boolean);
            if (errore) {
                toast(errore, 'error');
                return;
            }
            const pulsante = evento.currentTarget;
            pulsante.disabled = true;
            const valori = unisci(sezioni);
            const salvataOllama = await ollama.saveConfig(valori.ollama);
            const salvataAi = salvataOllama.success ? await api.saveConfig(valori.ai) : salvataOllama;
            pulsante.disabled = false;
            if (!salvataAi.success) {
                toast(`Impostazioni non salvate: ${salvataAi.error}`, 'error');
                return;
            }
            window.dispatchEvent(new CustomEvent('koradest:jarvis-stato', { detail: { stato: salvataAi.data.jarvis } }));
            toast('Impostazioni dell\'intelligenza artificiale salvate', 'success');
            aggiornaStato(salvataAi.data);
        });
    }
};
