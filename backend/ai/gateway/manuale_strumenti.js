'use strict';

const { seleziona } = require('./selezione_strumenti');

const PREFISSO = 'koradest__';
const MASSIMO_ELENCO = 25;
const MASSIMO_CARICABILI = 5;
const NESSUN_PARAMETRO = Object.freeze({ type: 'object', properties: {}, required: [] });

const DEFINIZIONI = Object.freeze([
    {
        nome: `${PREFISSO}elenco_app`,
        descrizione: 'Manuale di KORADEST. Elenca le applicazioni che puoi usare per conto dell\'utente, con cosa fanno e quanti strumenti hanno. Usalo quando gli strumenti che hai non bastano.',
        parametri: NESSUN_PARAMETRO,
        modifica: false
    },
    {
        nome: `${PREFISSO}strumenti_app`,
        descrizione: 'Manuale di KORADEST. Elenca nome e scopo degli strumenti di un\'applicazione, dal più pertinente alla richiesta. Con "cerca" filtra per parola.',
        parametri: {
            type: 'object',
            properties: {
                app: { type: 'string', description: 'Identificativo dell\'applicazione, preso da koradest__elenco_app' },
                cerca: { type: 'string', description: 'Parola da cercare nel nome o nello scopo dello strumento' }
            },
            required: ['app']
        },
        modifica: false
    },
    {
        nome: `${PREFISSO}carica_strumenti`,
        descrizione: `Rende utilizzabili dal passo successivo fino a ${MASSIMO_CARICABILI} strumenti scelti dal manuale, con i loro parametri completi.`,
        parametri: {
            type: 'object',
            properties: { nomi: { type: 'array', items: { type: 'string' }, description: 'Nomi completi degli strumenti, come li restituisce koradest__strumenti_app' } },
            required: ['nomi']
        },
        modifica: false
    }
]);

const appDi = nome => String(nome).split('__')[0];
const riassunto = (testo, massimo) => (String(testo || '').length > massimo ? `${String(testo).slice(0, massimo - 1)}…` : String(testo || ''));

function creaManuale({ disponibili, richiesta, insieme }) {
    const perNome = new Map(disponibili.map(strumento => [strumento.nome, strumento]));

    const elencoApp = () => {
        const gruppi = new Map();
        disponibili.forEach((strumento) => {
            const app = appDi(strumento.nome);
            const voce = gruppi.get(app) || { app, nome: strumento.nomeApp || app, descrizione: riassunto(strumento.descrizioneApp, 160), strumenti: 0 };
            voce.strumenti += 1;
            gruppi.set(app, voce);
        });
        return [...gruppi.values()];
    };

    const strumentiApp = ({ app, cerca }) => {
        const dellApp = disponibili.filter(strumento => appDi(strumento.nome) === app);
        if (dellApp.length === 0) return { errore: `Applicazione sconosciuta o non accessibile: ${app}. Usa koradest__elenco_app.` };
        const filtrati = cerca
            ? seleziona({ strumenti: dellApp, richiesta: cerca, appAttiva: app, massimo: MASSIMO_ELENCO, budgetCaratteri: Infinity })
            : [...seleziona({ strumenti: dellApp, richiesta, appAttiva: app, massimo: MASSIMO_ELENCO, budgetCaratteri: Infinity }), ...dellApp];
        const unici = [...new Set(filtrati)].slice(0, MASSIMO_ELENCO);
        return {
            app,
            totale: dellApp.length,
            mostrati: unici.length,
            strumenti: unici.map(strumento => ({ nome: strumento.nome, scopo: riassunto(strumento.descrizione, 110), scrive: strumento.modifica })),
            nota: unici.length < dellApp.length ? 'Elenco parziale: usa "cerca" per trovare gli altri strumenti' : undefined
        };
    };

    const caricaStrumenti = ({ nomi }) => {
        const richiesti = (Array.isArray(nomi) ? nomi : []).slice(0, MASSIMO_CARICABILI);
        const trovati = richiesti.map(nome => perNome.get(nome)).filter(Boolean);
        insieme.aggiungi(trovati);
        return { caricati: trovati.map(strumento => strumento.nome), non_trovati: richiesti.filter(nome => !perNome.has(nome)) };
    };

    const GESTORI = {
        [`${PREFISSO}elenco_app`]: elencoApp,
        [`${PREFISSO}strumenti_app`]: strumentiApp,
        [`${PREFISSO}carica_strumenti`]: caricaStrumenti
    };

    return Object.freeze({
        definizioni: DEFINIZIONI,
        gestisce: nome => Object.prototype.hasOwnProperty.call(GESTORI, nome),
        esegui: chiamata => GESTORI[chiamata.nome](chiamata.argomenti || {})
    });
}

module.exports = { creaManuale, PREFISSO };
