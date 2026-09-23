'use strict';

const FORNITORI = Object.freeze(['ollama', 'gemini']);
const STATI_JARVIS = Object.freeze(['attivo', 'disattivo', 'da_chiedere']);
const PERMANENZE = Object.freeze(['0', '5m', '30m', '1h', '4h', '24h', '-1']);
const MODELLO = /^[A-Za-z0-9._:\/-]{1,128}$/;
const VARIANTE = /^[a-z][a-z ]{2,29}$/;
const MASSIMO_VARIANTI = 20;
const MODELLO_CONSIGLIATO = 'minicpm-v4.6';

const PREDEFINITA = Object.freeze({
    fornitore: 'ollama',
    modelli: Object.freeze({ ollama: MODELLO_CONSIGLIATO, gemini: 'gemini-2.5-flash' }),
    passiMassimi: 8,
    timeoutMs: 60000,
    temperatura: 0.4,
    contestoMassimo: 8192,
    strumentiMassimi: 12,
    jarvis: 'da_chiedere',
    precaricaAllAvvio: false,
    mantieniInMemoria: '5m',
    inviaContestoPagina: true,
    confermaScritture: true,
    apprendimento: true,
    memoriaUtente: true,
    ascoltoContinuo: false,
    restaInAscoltoSecondi: 8,
    variantiAttivazione: Object.freeze([])
});

const intervallo = (valore, minimo, massimo, predefinito) => {
    const numero = Number(valore);
    return Number.isFinite(numero) ? Math.min(massimo, Math.max(minimo, numero)) : predefinito;
};

const booleano = (valore, predefinito) => (typeof valore === 'boolean' ? valore : predefinito);
const tra = (elenco, valore, predefinito) => (elenco.includes(valore) ? valore : predefinito);

const varianti = valore => Object.freeze([...new Set((Array.isArray(valore) ? valore : [])
    .map(voce => String(voce || '').toLowerCase().replace(/\s+/g, ' ').trim())
    .filter(voce => VARIANTE.test(voce)))].slice(0, MASSIMO_VARIANTI));

function normalizza(grezza = {}, modelloOllama = null) {
    const modelli = { ...PREDEFINITA.modelli, ...(modelloOllama ? { ollama: modelloOllama } : {}), ...(grezza.modelli || {}) };
    return Object.freeze({
        fornitore: tra(FORNITORI, grezza.fornitore, PREDEFINITA.fornitore),
        modelli: Object.freeze(Object.fromEntries(FORNITORI.map(nome => [nome, MODELLO.test(String(modelli[nome] || '')) ? modelli[nome] : PREDEFINITA.modelli[nome]]))),
        passiMassimi: Math.round(intervallo(grezza.passiMassimi, 1, 12, PREDEFINITA.passiMassimi)),
        timeoutMs: Math.round(intervallo(grezza.timeoutMs, 5000, 300000, PREDEFINITA.timeoutMs)),
        temperatura: intervallo(grezza.temperatura, 0, 1, PREDEFINITA.temperatura),
        contestoMassimo: Math.round(intervallo(grezza.contestoMassimo, 2048, 262144, PREDEFINITA.contestoMassimo)),
        strumentiMassimi: Math.round(intervallo(grezza.strumentiMassimi, 3, 40, PREDEFINITA.strumentiMassimi)),
        jarvis: tra(STATI_JARVIS, grezza.jarvis, PREDEFINITA.jarvis),
        precaricaAllAvvio: booleano(grezza.precaricaAllAvvio, PREDEFINITA.precaricaAllAvvio),
        mantieniInMemoria: tra(PERMANENZE, String(grezza.mantieniInMemoria ?? ''), PREDEFINITA.mantieniInMemoria),
        inviaContestoPagina: booleano(grezza.inviaContestoPagina, PREDEFINITA.inviaContestoPagina),
        confermaScritture: booleano(grezza.confermaScritture, PREDEFINITA.confermaScritture),
        apprendimento: booleano(grezza.apprendimento, PREDEFINITA.apprendimento),
        memoriaUtente: booleano(grezza.memoriaUtente, PREDEFINITA.memoriaUtente),
        ascoltoContinuo: booleano(grezza.ascoltoContinuo, PREDEFINITA.ascoltoContinuo),
        restaInAscoltoSecondi: Math.round(intervallo(grezza.restaInAscoltoSecondi, 0, 60, PREDEFINITA.restaInAscoltoSecondi)),
        variantiAttivazione: varianti(grezza.variantiAttivazione)
    });
}

function creaConfigurazione({ leggiConfig, aggiornaSezione }) {
    const leggi = () => {
        const config = leggiConfig() || {};
        return normalizza(config.ai || {}, config.ollama && config.ollama.defaultModel);
    };
    const aggiorna = (modifiche = {}) => {
        const attuale = leggi();
        const unita = normalizza({ ...attuale, ...modifiche, modelli: { ...attuale.modelli, ...(modifiche.modelli || {}) } });
        return aggiornaSezione('ai', () => unita);
    };
    return Object.freeze({ leggi, aggiorna });
}

module.exports = { creaConfigurazione, normalizza, FORNITORI, STATI_JARVIS, PERMANENZE, PREDEFINITA, MODELLO_CONSIGLIATO };
