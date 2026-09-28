'use strict';

const BASE = 'https://api.openai.com/v1';

function schemaOpenAI(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const { type, properties, required, items } = schema;
    const result = { type, additionalProperties: false };
    if (properties) {
        result.properties = Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, schemaOpenAI(v)]));
    }
    if (required) result.required = required;
    if (items) result.items = schemaOpenAI(items);
    return result;
}

function contenutoOpenAI(messaggio) {
    if (messaggio.ruolo === 'strumento') {
        return {
            role: 'tool',
            tool_call_id: messaggio.risultato.id,
            content: JSON.stringify(messaggio.risultato.dati)
        };
    }
    const content = messaggio.testo || '';
    const result = { role: messaggio.ruolo === 'assistente' ? 'assistant' : (messaggio.ruolo === 'sistema' ? 'system' : 'user'), content };
    if (messaggio.chiamate && messaggio.chiamate.length > 0) {
        result.tool_calls = messaggio.chiamate.map(c => ({
            id: c.id,
            type: 'function',
            function: { name: c.nome, arguments: JSON.stringify(c.argomenti) }
        }));
    }
    return result;
}

function crea({ chiave, timeoutMs, temperatura, esegui = fetch }) {
    if (!chiave) throw new Error('Chiave API di OpenAI non configurata: inseriscila in Amministratore › Server Ollama & AI');

    const chiama = async (percorso, corpo = null) => {
        const risposta = await esegui(`${BASE}/${percorso}`, {
            method: corpo ? 'POST' : 'GET',
            headers: {
                'Authorization': `Bearer ${chiave}`,
                'Content-Type': 'application/json'
            },
            body: corpo ? JSON.stringify(corpo) : undefined,
            signal: AbortSignal.timeout(timeoutMs)
        });
        const testo = await risposta.text();
        const dati = testo ? JSON.parse(testo) : {};
        if (!risposta.ok) throw new Error(`OpenAI ha risposto ${risposta.status}: ${(dati.error && dati.error.message) || risposta.statusText}`);
        return dati;
    };

    return Object.freeze({
        nome: 'openai',
        esterno: true,
        async chat({ messaggi, strumenti = [], modello }) {
            const messages = messaggi.map(contenutoOpenAI);
            const corpo = { model: modello, messages, temperature: temperatura };
            if (strumenti.length > 0) {
                corpo.tools = strumenti.map(s => ({
                    type: 'function',
                    function: { name: s.nome, description: s.descrizione, parameters: schemaOpenAI(s.parametri), strict: true }
                }));
            }
            const dati = await chiama('chat/completions', corpo);
            const msg = dati.choices[0].message;
            return {
                testo: msg.content || '',
                chiamate: (msg.tool_calls || []).map(tc => ({
                    id: tc.id,
                    nome: tc.function.name,
                    argomenti: JSON.parse(tc.function.arguments)
                }))
            };
        },
        carica: async () => ({ supportato: false, motivo: "OpenAI gira nel cloud." }),
        libera: async () => ({ supportato: false, motivo: "OpenAI gira nel cloud." }),
        async modelli() {
            try {
                const dati = await chiama('models');
                return dati.data.map(m => m.id).filter(id => id.startsWith('gpt'));
            } catch(e) { return ['gpt-4o', 'gpt-4o-mini']; }
        },
        async stato() {
            const inizio = Date.now();
            try { await chiama('models'); } catch(e) {}
            return { disponibile: true, latenzaMs: Date.now() - inizio, errore: null, destinazione: 'api.openai.com' };
        }
    });
}

module.exports = { crea };
