'use strict';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CHIAVI_SCHEMA = new Set(['type', 'description', 'properties', 'required', 'items', 'enum', 'format', 'nullable']);

function schemaGemini(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    return Object.fromEntries(Object.entries(schema)
        .filter(([chiave]) => CHIAVI_SCHEMA.has(chiave))
        .map(([chiave, valore]) => {
            if (chiave === 'type') return [chiave, String(valore).toUpperCase()];
            if (chiave === 'properties') return [chiave, Object.fromEntries(Object.entries(valore).map(([nome, figlio]) => [nome, schemaGemini(figlio)]))];
            if (chiave === 'items') return [chiave, schemaGemini(valore)];
            return [chiave, valore];
        }));
}

function contenutoGemini(messaggio) {
    if (messaggio.ruolo === 'strumento') {
        return { role: 'user', parts: [{ functionResponse: { name: messaggio.risultato.nome, response: { contenuto: messaggio.risultato.dati } } }] };
    }
    const parti = messaggio.testo ? [{ text: messaggio.testo }] : [];
    (messaggio.chiamate || []).forEach(chiamata => parti.push({ functionCall: { name: chiamata.nome, args: chiamata.argomenti } }));
    return { role: messaggio.ruolo === 'assistente' ? 'model' : 'user', parts: parti };
}

function unisciRisposteStrumenti(contenuti) {
    return contenuti.reduce((uniti, contenuto) => {
        const ultimo = uniti[uniti.length - 1];
        const soloRisposte = parti => parti.every(parte => parte.functionResponse);
        if (ultimo && ultimo.role === 'user' && soloRisposte(ultimo.parts) && soloRisposte(contenuto.parts)) {
            ultimo.parts.push(...contenuto.parts);
            return uniti;
        }
        uniti.push({ role: contenuto.role, parts: [...contenuto.parts] });
        return uniti;
    }, []);
}

function crea({ chiave, timeoutMs, temperatura, esegui = fetch }) {
    if (!chiave) throw new Error('Chiave API di Gemini non configurata: inseriscila in Amministratore › Server Ollama & AI');

    const chiama = async (percorso, corpo = null) => {
        const risposta = await esegui(`${BASE}/${percorso}`, {
            method: corpo ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
            body: corpo ? JSON.stringify(corpo) : undefined,
            signal: AbortSignal.timeout(timeoutMs)
        });
        const testo = await risposta.text();
        const dati = testo ? JSON.parse(testo) : {};
        if (!risposta.ok) throw new Error(`Gemini ha risposto ${risposta.status}: ${(dati.error && dati.error.message) || risposta.statusText}`);
        return dati;
    };

    return Object.freeze({
        nome: 'gemini',
        esterno: true,
        async chat({ messaggi, strumenti = [], modello }) {
            const sistema = messaggi.filter(messaggio => messaggio.ruolo === 'sistema').map(messaggio => messaggio.testo).join('\n\n');
            const corpo = {
                contents: unisciRisposteStrumenti(messaggi.filter(messaggio => messaggio.ruolo !== 'sistema').map(contenutoGemini)),
                generationConfig: { temperature: temperatura }
            };
            if (sistema) corpo.systemInstruction = { parts: [{ text: sistema }] };
            if (strumenti.length > 0) {
                corpo.tools = [{ functionDeclarations: strumenti.map(strumento => ({ name: strumento.nome, description: strumento.descrizione, parameters: schemaGemini(strumento.parametri) })) }];
            }
            const dati = await chiama(`models/${encodeURIComponent(modello)}:generateContent`, corpo);
            if (dati.promptFeedback && dati.promptFeedback.blockReason) throw new Error(`Richiesta bloccata da Gemini: ${dati.promptFeedback.blockReason}`);
            const candidato = (dati.candidates || [])[0];
            if (!candidato || !candidato.content) throw new Error(`Gemini non ha prodotto una risposta (${candidato ? candidato.finishReason : 'nessun candidato'})`);
            const parti = candidato.content.parts || [];
            return {
                testo: parti.filter(parte => typeof parte.text === 'string').map(parte => parte.text).join(''),
                chiamate: parti.filter(parte => parte.functionCall).map((parte, indice) => ({
                    id: `gemini-${indice}`,
                    nome: parte.functionCall.name,
                    argomenti: parte.functionCall.args || {}
                }))
            };
        },
        carica: async () => ({ supportato: false, motivo: "Gemini gira nel cloud: non c'è un modello da caricare in memoria" }),
        libera: async () => ({ supportato: false, motivo: 'Gemini gira nel cloud: non occupa memoria su questo computer' }),
        async modelli() {
            const dati = await chiama('models?pageSize=200');
            return (dati.models || [])
                .filter(modello => (modello.supportedGenerationMethods || []).includes('generateContent'))
                .map(modello => String(modello.name).replace(/^models\//, ''));
        },
        async stato() {
            const inizio = Date.now();
            await chiama('models?pageSize=1');
            return { disponibile: true, latenzaMs: Date.now() - inizio, errore: null, destinazione: 'generativelanguage.googleapis.com' };
        }
    });
}

module.exports = { crea, schemaGemini, unisciRisposteStrumenti };
