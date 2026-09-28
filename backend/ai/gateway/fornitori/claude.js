'use strict';

const BASE = 'https://api.anthropic.com/v1';

function schemaClaude(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const { type, properties, required, items } = schema;
    const result = { type };
    if (properties) {
        result.properties = Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, schemaClaude(v)]));
    }
    if (required) result.required = required;
    if (items) result.items = schemaClaude(items);
    return result;
}

function contenutoClaude(messaggio) {
    if (messaggio.ruolo === 'strumento') {
        return {
            role: 'user',
            content: [{
                type: 'tool_result',
                tool_use_id: messaggio.risultato.id,
                content: JSON.stringify(messaggio.risultato.dati)
            }]
        };
    }
    const content = [];
    if (messaggio.testo) content.push({ type: 'text', text: messaggio.testo });
    (messaggio.chiamate || []).forEach(chiamata => {
        content.push({ type: 'tool_use', id: chiamata.id, name: chiamata.nome, input: chiamata.argomenti });
    });
    return { role: messaggio.ruolo === 'assistente' ? 'assistant' : 'user', content };
}

function crea({ chiave, timeoutMs, temperatura, esegui = fetch }) {
    if (!chiave) throw new Error('Chiave API di Claude non configurata: inseriscila in Amministratore › Server Ollama & AI');

    const chiama = async (percorso, corpo = null) => {
        const risposta = await esegui(`${BASE}/${percorso}`, {
            method: corpo ? 'POST' : 'GET',
            headers: {
                'x-api-key': chiave,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: corpo ? JSON.stringify(corpo) : undefined,
            signal: AbortSignal.timeout(timeoutMs)
        });
        const testo = await risposta.text();
        const dati = testo ? JSON.parse(testo) : {};
        if (!risposta.ok) throw new Error(`Claude ha risposto ${risposta.status}: ${(dati.error && dati.error.message) || risposta.statusText}`);
        return dati;
    };

    return Object.freeze({
        nome: 'claude',
        esterno: true,
        async chat({ messaggi, strumenti = [], modello }) {
            const sistema = messaggi.filter(m => m.ruolo === 'sistema').map(m => m.testo).join('\n\n');
            const systemProp = sistema ? { system: sistema } : {};
            const toolsProp = strumenti.length > 0 ? {
                tools: strumenti.map(s => ({ name: s.nome, description: s.descrizione, input_schema: schemaClaude(s.parametri) }))
            } : {};
            const messages = messaggi.filter(m => m.ruolo !== 'sistema').map(contenutoClaude);
            const corpo = { model: modello, max_tokens: 4096, temperature: temperatura, messages, ...systemProp, ...toolsProp };
            const dati = await chiama('messages', corpo);
            
            const textBlocks = dati.content.filter(b => b.type === 'text').map(b => b.text).join('');
            const toolBlocks = dati.content.filter(b => b.type === 'tool_use').map(b => ({
                id: b.id,
                nome: b.name,
                argomenti: b.input
            }));
            return { testo: textBlocks, chiamate: toolBlocks };
        },
        carica: async () => ({ supportato: false, motivo: "Claude gira nel cloud." }),
        libera: async () => ({ supportato: false, motivo: "Claude gira nel cloud." }),
        async modelli() { return ['claude-3-5-sonnet-latest', 'claude-3-haiku-20240307', 'claude-3-opus-20240229']; },
        async stato() {
            const inizio = Date.now();
            try { await chiama('messages', { messages: [{ role: 'user', content: 'ping' }], model: 'claude-3-haiku-20240307', max_tokens: 1 }); } catch(e) {}
            return { disponibile: true, latenzaMs: Date.now() - inizio, errore: null, destinazione: 'api.anthropic.com' };
        }
    });
}

module.exports = { crea };
