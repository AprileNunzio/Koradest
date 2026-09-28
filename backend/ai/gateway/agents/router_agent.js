'use strict';

const { creaSessione } = require('../sessione_richiesta');
const databaseAgent = require('./database_agent');
const networkAgent = require('./network_agent');
const uiAgent = require('./ui_agent');
const defaultAgent = require('./default_agent');

const AGENTI = {
    'database': databaseAgent,
    'network': networkAgent,
    'ui': uiAgent,
    'default': defaultAgent
};

const ROUTER_PROMPT = `
Sei il Router Agent di Jarvis. Il tuo compito è analizzare la richiesta dell'utente e stabilire quale sotto-agente specializzato deve gestirla.
Rispondi ESCLUSIVAMENTE con un JSON valido contenente la chiave "agente" e come valore uno dei seguenti:
- "database" (per query SQL, dati su tabelle)
- "network" (per sincronizzazione P2P, mesh, nodi, DAG)
- "ui" (per manipolazione schermo, dashboard, interfacce)
- "default" (per conversazione generale, calcoli o richieste vaghe)

Esempio: {"agente": "database"}
`;

async function instrada({ conf, fornitore, utente, testo, appAttiva, dipendenze }) {
    let agenteScelto = 'default';
    try {
        const messaggiRouting = [
            { ruolo: 'sistema', testo: ROUTER_PROMPT },
            { ruolo: 'utente', testo }
        ];
        const risposta = await fornitore.chat({ messaggi: messaggiRouting, strumenti: [], modello: conf.modelli[conf.fornitore] });
        const jsonMatch = risposta.testo.match(/\{.*?\}/s);
        if (jsonMatch) {
            const parsing = JSON.parse(jsonMatch[0]);
            if (AGENTI[parsing.agente]) {
                agenteScelto = parsing.agente;
            }
        }
    } catch (e) {
        console.warn('[RouterAgent] Fallback su default agent:', e.message);
    }

    const agente = AGENTI[agenteScelto];
    const sistemaSpecializzato = agente.sistema(appAttiva);
    
    const sessione = creaSessione({ 
        conf, 
        fornitore, 
        utente, 
        testo, 
        sistema: sistemaSpecializzato, 
        appAttiva, 
        dipendenze,
        agenteId: agenteScelto
    });

    return { sessione, agenteNome: agenteScelto };
}

module.exports = { instrada, AGENTI };
