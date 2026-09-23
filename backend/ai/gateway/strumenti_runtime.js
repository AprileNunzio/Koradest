'use strict';

const { interpreta, descrizioneAutomatica } = require('./interpretazione_azioni');

const TIPI = Object.freeze({
    testo: { type: 'string' },
    numero: { type: 'number' },
    intero: { type: 'integer' },
    booleano: { type: 'boolean' },
    data: { type: 'string', format: 'date', description: 'Data nel formato AAAA-MM-GG' },
    dataOra: { type: 'string', format: 'date-time' },
    email: { type: 'string', description: 'Indirizzo email' },
    id: { type: 'string', description: 'Identificativo del record' },
    elenco: { type: 'array', items: { type: 'string' } },
    oggetto: { type: 'object', properties: {} },
    codiceFiscale: { type: 'string', description: 'Codice fiscale italiano di 16 caratteri' }
});

function regolaDi(grezza) {
    if (typeof grezza === 'string') return { tipo: grezza.replace(/!$/, ''), obbligatorio: grezza.endsWith('!') };
    return grezza || {};
}

function schemaDaValidazione(valida) {
    const voci = Object.entries(valida || {}).map(([campo, grezza]) => [campo, regolaDi(grezza)]);
    return {
        type: 'object',
        properties: Object.fromEntries(voci.map(([campo, regola]) => {
            const base = { ...(TIPI[regola.tipo] || TIPI.testo) };
            if (Array.isArray(regola.valori)) base.enum = regola.valori;
            if (regola.descrizione) base.description = regola.descrizione;
            return [campo, base];
        })),
        required: voci.filter(([, regola]) => regola.obbligatorio).map(([campo]) => campo)
    };
}

function descrizioneDi(nomeApp, descrizioneApp, azione) {
    if (azione.descrizione) return azione.descrizione;
    return descrizioneAutomatica({ nomeAzione: azione.nome, nomeApp, descrizioneApp, parametri: Object.keys(azione.valida || {}) });
}

function strumento({ appId, nomeApp, descrizioneApp, nome, descrizione, parametri, accesso, modifica }) {
    return {
        type: 'function',
        function: { name: `${appId}__${nome}`, description: descrizione, parameters: parametri },
        metadata: {
            appId,
            nomeApp,
            descrizioneApp,
            action: nome,
            requiredRole: 'user',
            requiredPermission: null,
            accesso: Object.freeze(accesso),
            modifica
        }
    };
}

function definizioni({ appId, nomeApp, descrizioneApp = null, azioni, ruoliPredefiniti = [] }) {
    return azioni
        .filter(azione => !String(azione.nome).startsWith('koradest.'))
        .map(azione => strumento({
            appId,
            nomeApp,
            descrizioneApp,
            nome: azione.nome,
            descrizione: descrizioneDi(nomeApp, descrizioneApp, azione),
            parametri: schemaDaValidazione(azione.valida),
            accesso: { appId, ruoli: azione.ruoli || [], ruoliPredefiniti },
            modifica: azione.modifica === true || interpreta(azione.nome).scrive === true
        }));
}

function definizioniSenzaContratto({ appId, nomeApp, descrizioneApp = null, nomiAzioni }) {
    return [...new Set(nomiAzioni)]
        .filter(nome => typeof nome === 'string' && /^[A-Za-z][\w.-]{0,79}$/.test(nome))
        .map(nome => strumento({
            appId,
            nomeApp,
            descrizioneApp,
            nome,
            descrizione: `${descrizioneAutomatica({ nomeAzione: nome, nomeApp, descrizioneApp })} L'app non dichiara i parametri: passa solo i campi che l'utente ha indicato.`,
            parametri: { type: 'object', properties: {}, required: [] },
            accesso: { appId, ruoli: [], ruoliPredefiniti: [] },
            modifica: interpreta(nome).scrive !== false
        }));
}

function accessoConsentito(utente, accesso) {
    const permessi = Array.isArray(utente && utente.permessi) ? utente.permessi : (Array.isArray(utente && utente.permissions) ? utente.permissions : []);
    if (permessi.includes('*') || permessi.includes(`${accesso.appId}:*`)) return true;
    const accedeAllApp = permessi.some(permesso => permesso.startsWith(`${accesso.appId}:`));
    if (!accedeAllApp) return false;
    if (accesso.ruoli.length === 0) return true;
    return accesso.ruoli.some(ruolo => accesso.ruoliPredefiniti.includes(ruolo) || permessi.includes(`${accesso.appId}:${ruolo}`));
}

module.exports = { schemaDaValidazione, definizioni, definizioniSenzaContratto, accessoConsentito };
