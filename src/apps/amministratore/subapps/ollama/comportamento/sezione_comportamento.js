import { esc, opzioni, interruttore, scheda, campo, mostraEsito } from '../comune/ui.js';

const PERMANENZE = [
    { valore: '0', etichetta: 'Libera subito dopo ogni risposta' },
    { valore: '5m', etichetta: '5 minuti' },
    { valore: '30m', etichetta: '30 minuti' },
    { valore: '1h', etichetta: '1 ora' },
    { valore: '4h', etichetta: '4 ore' },
    { valore: '24h', etichetta: '24 ore' },
    { valore: '-1', etichetta: 'Sempre, finché KORADEST è aperto' }
];

const CONTESTI = [4096, 8192, 16384, 32768, 65536, 131072].map(valore => ({ valore, etichetta: `${valore.toLocaleString('it-IT')} token` }));

const numero = (id, minimo, massimo, valore, passo = 1) => `<input id="${id}" class="k-input" type="number" min="${minimo}" max="${massimo}" step="${passo}" value="${esc(valore)}">`;

export function montaMemoria(contenitore, { api, configurazione }) {
    contenitore.innerHTML = scheda('memory', 'Memoria del modello', 'Quando il modello si carica e quanto resta in RAM o in memoria video. Vale per Ollama.', `
        <div class="k-form-grid">
            ${interruttore('ai-precarica', 'Carica il modello in memoria all\'avvio di KORADEST', configurazione.precaricaAllAvvio, 'La prima risposta arriva subito, ma il modello occupa memoria da quando apri il programma.')}
            ${campo('ai-permanenza', 'Tieni il modello in memoria', `<select id="ai-permanenza" class="k-select">${opzioni(PERMANENZE, configurazione.mantieniInMemoria)}</select>`, 'Dopo questo tempo senza domande Ollama libera la memoria.')}
        </div>
        <div class="k-row">
            <button type="button" class="k-btn" data-carica-modello><span class="material-symbols-rounded" aria-hidden="true">download</span>Carica ora</button>
            <button type="button" class="k-btn k-btn--ghost" data-libera-modello><span class="material-symbols-rounded" aria-hidden="true">memory</span>Libera memoria</button>
        </div>
        <div class="k-alert" data-esito-memoria hidden></div>`);

    const esito = contenitore.querySelector('[data-esito-memoria]');
    const esegui = async (azione, pulsante) => {
        pulsante.disabled = true;
        mostraEsito(esito, 'info', azione === 'carica' ? 'Caricamento del modello in memoria…' : 'Liberazione della memoria…');
        const risposta = await (azione === 'carica' ? api.loadModel() : api.releaseModel());
        pulsante.disabled = false;
        if (!risposta.success) return mostraEsito(esito, 'danger', risposta.error);
        if (risposta.data.supportato === false) return mostraEsito(esito, 'info', risposta.data.motivo);
        return mostraEsito(esito, 'success', azione === 'carica' ? `Modello ${risposta.data.modello} caricato in memoria` : 'Memoria del modello liberata');
    };
    contenitore.querySelector('[data-carica-modello]').addEventListener('click', evento => esegui('carica', evento.currentTarget));
    contenitore.querySelector('[data-libera-modello]').addEventListener('click', evento => esegui('libera', evento.currentTarget));

    return {
        valori: () => ({
            ai: {
                precaricaAllAvvio: contenitore.querySelector('#ai-precarica').checked,
                mantieniInMemoria: contenitore.querySelector('#ai-permanenza').value
            }
        })
    };
}

export function montaRagionamento(contenitore, { configurazione }) {
    contenitore.innerHTML = scheda('psychology', 'Ragionamento', 'Quanto contesto usare, quanti strumenti proporre e fin dove può spingersi l\'agente per ogni richiesta.', `
        <div class="k-form-grid">
            ${campo('ai-contesto', 'Contesto massimo del modello', `<select id="ai-contesto" class="k-select">${opzioni(CONTESTI, configurazione.contestoMassimo)}</select>`, 'Deve corrispondere a quanto regge il modello: KORADEST non lo supera mai e lo comunica a Ollama.')}
            ${campo('ai-strumenti', 'Strumenti proposti per domanda', numero('ai-strumenti', 3, 40, configurazione.strumentiMassimi), 'Gli altri restano consultabili dal manuale, un passo alla volta.')}
            ${campo('ai-passi', 'Passi massimi per richiesta', numero('ai-passi', 1, 12, configurazione.passiMassimi), 'Ogni consultazione del manuale o esecuzione di uno strumento è un passo.')}
            ${campo('ai-timeout', 'Attesa massima per risposta (secondi)', numero('ai-timeout', 5, 300, Math.round(configurazione.timeoutMs / 1000)))}
            ${campo('ai-temperatura', 'Creatività (0–1)', numero('ai-temperatura', 0, 1, configurazione.temperatura, 0.1), 'Più bassa per operazioni precise sui dati.')}
        </div>`);

    const leggi = selettore => Number(contenitore.querySelector(selettore).value);
    return {
        valori: () => ({
            ai: {
                contestoMassimo: leggi('#ai-contesto'),
                strumentiMassimi: leggi('#ai-strumenti'),
                passiMassimi: leggi('#ai-passi'),
                timeoutMs: leggi('#ai-timeout') * 1000,
                temperatura: leggi('#ai-temperatura')
            }
        })
    };
}
