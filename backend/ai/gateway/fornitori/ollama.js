'use strict';

const OllamaClient = require('../../ollama/OllamaClient');
const protocollo = require('../protocollo_testuale');

const RUOLI = { sistema: 'system', utente: 'user', assistente: 'assistant', strumento: 'tool' };
const SENZA_STRUMENTI = /does not support tools|tools? (are )?not supported/i;
const capacitaNote = new Map();

function messaggioOllama(messaggio) {
    if (messaggio.ruolo === 'strumento') {
        return { role: 'tool', tool_name: messaggio.risultato.nome, content: JSON.stringify(messaggio.risultato.dati) };
    }
    const convertito = { role: RUOLI[messaggio.ruolo], content: messaggio.testo || '' };
    if (Array.isArray(messaggio.chiamate) && messaggio.chiamate.length > 0) {
        convertito.tool_calls = messaggio.chiamate.map(chiamata => ({ function: { name: chiamata.nome, arguments: chiamata.argomenti } }));
    }
    return convertito;
}

function strumentoOllama(strumento) {
    return { type: 'function', function: { name: strumento.nome, description: strumento.descrizione, parameters: strumento.parametri } };
}

function argomenti(valore) {
    return typeof valore === 'string' ? JSON.parse(valore || '{}') : (valore || {});
}

const inKeepAlive = valore => (/^-?\d+$/.test(String(valore)) ? Number(valore) : valore);

function descriviCapacita(dati) {
    const elenco = Array.isArray(dati && dati.capabilities) ? dati.capabilities : null;
    const dettagli = (dati && dati.details) || {};
    return {
        strumenti: elenco ? elenco.includes('tools') : null,
        immagini: elenco ? elenco.includes('vision') : null,
        ragionamento: elenco ? elenco.includes('thinking') : null,
        famiglia: dettagli.family || null,
        parametri: dettagli.parameter_size || null,
        quantizzazione: dettagli.quantization_level || null
    };
}

function crea({ host, timeoutMs, temperatura, contestoMassimo, mantieniInMemoria = '5m', modelloPredefinito = null }) {
    const client = new OllamaClient(host);
    client.timeoutMs = timeoutMs;
    const keepAlive = inKeepAlive(mantieniInMemoria);
    const chiaveCapacita = modello => `${host}|${modello}`;

    const memoria = async (valore) => {
        const esito = await client.impostaMemoria({ model: modelloPredefinito, keepAlive: valore });
        if (!esito.success) throw new Error(`Ollama non ha gestito il modello: ${esito.error}`);
        return { supportato: true, modello: modelloPredefinito };
    };

    async function capacita(modello = modelloPredefinito) {
        if (capacitaNote.has(chiaveCapacita(modello))) return capacitaNote.get(chiaveCapacita(modello));
        const esito = await client.mostra(modello);
        if (!esito.success) {
            if (esito.statusCode === 404) return { installato: false, strumenti: null };
            throw new Error(`Ollama non descrive il modello ${modello}: ${esito.error}`);
        }
        const descrizione = { installato: true, ...descriviCapacita(esito.data) };
        capacitaNote.set(chiaveCapacita(modello), descrizione);
        return descrizione;
    }

    const modoStrumenti = async (modello, strumenti) => {
        if (!strumenti.length) return 'nessuno';
        const note = await capacita(modello).catch(() => ({ strumenti: null }));
        return note.strumenti === false ? 'testuale' : 'nativo';
    };

    const leggiRisposta = (esito, strumenti) => {
        const messaggio = (esito.data && esito.data.message) || {};
        const native = (messaggio.tool_calls || []).map((chiamata, indice) => ({
            id: `ollama-${indice}`,
            nome: chiamata.function.name,
            argomenti: argomenti(chiamata.function.arguments)
        }));
        if (native.length) return { testo: messaggio.content || '', chiamate: native };
        return protocollo.estrai(messaggio.content || '', strumenti.map(strumento => strumento.nome));
    };

    async function invia({ messaggi, strumenti, modello, modo }) {
        const testuale = modo === 'testuale';
        return client.chat({
            messages: (testuale ? protocollo.conversazioneTestuale(messaggi, strumenti) : messaggi).map(messaggioOllama),
            tools: modo === 'nativo' ? strumenti.map(strumentoOllama) : [],
            model: modello,
            options: { temperature: temperatura, num_ctx: contestoMassimo },
            keepAlive
        });
    }

    return Object.freeze({
        nome: 'ollama',
        esterno: false,
        async chat({ messaggi, strumenti = [], modello }) {
            const modo = await modoStrumenti(modello, strumenti);
            let esito = await invia({ messaggi, strumenti, modello, modo });
            if (!esito.success && modo === 'nativo' && SENZA_STRUMENTI.test(String(esito.error))) {
                capacitaNote.set(chiaveCapacita(modello), { ...(capacitaNote.get(chiaveCapacita(modello)) || { installato: true }), strumenti: false });
                esito = await invia({ messaggi, strumenti, modello, modo: 'testuale' });
            }
            if (!esito.success) throw new Error(`Ollama non ha risposto: ${esito.error}`);
            return leggiRisposta(esito, strumenti);
        },
        capacita,
        scarica: (modello, alProgresso) => {
            capacitaNote.delete(chiaveCapacita(modello));
            return client.scarica({ model: modello, onProgress: alProgresso });
        },
        carica: () => memoria(keepAlive),
        libera: () => memoria(0),
        async modelli() {
            const salute = await client.checkHealth();
            if (!salute.available) throw new Error(`Ollama non raggiungibile: ${salute.error || host}`);
            return (salute.models || []).map(modello => (typeof modello === 'string' ? modello : modello.name));
        },
        async stato() {
            const inizio = Date.now();
            const salute = await client.checkHealth();
            return { disponibile: salute.available === true, latenzaMs: salute.available ? Date.now() - inizio : -1, errore: salute.error || null, destinazione: host };
        }
    });
}

module.exports = { crea, descriviCapacita };
