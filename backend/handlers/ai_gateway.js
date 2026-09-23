'use strict';

const { gateway } = require('../ai/gateway');
const sessionManager = require('../core/session_manager');
const auditLogger = require('../observability/auditLogger');
const rbac = require('./rbac');

const CAMPI_CONFIGURABILI = [
    'fornitore', 'modelli', 'passiMassimi', 'timeoutMs', 'temperatura', 'contestoMassimo', 'strumentiMassimi',
    'jarvis', 'precaricaAllAvvio', 'mantieniInMemoria', 'inviaContestoPagina'
];
const PERMESSO_DECISIONE = 'amministratore:ollama:edit';

async function alConfine(operazione) {
    try {
        return { success: true, data: await operazione() };
    } catch (errore) {
        return { success: false, error: errore.message };
    }
}

const soloConsentiti = dati => Object.fromEntries(Object.entries(dati && typeof dati === 'object' ? dati : {})
    .filter(([chiave]) => CAMPI_CONFIGURABILI.includes(chiave)));

const utenteCorrente = () => sessionManager.getCurrentUserId() || 'sconosciuto';

const registra = (azione, dettagli) => auditLogger.logEvent(utenteCorrente(), azione, 'ai_config', dettagli.fornitore || 'ai', dettagli, 'SUCCESS');

function puoDecidere() {
    const utente = sessionManager.getCurrentUserId();
    if (!utente) return false;
    const permessi = rbac.getEffectiveUserPermissions(null, utente) || [];
    return permessi.includes('*') || permessi.includes(PERMESSO_DECISIONE);
}

module.exports = {
    getConfig: () => alConfine(() => gateway().descrivi()),
    saveConfig: (event, dati) => alConfine(() => {
        const salvata = gateway().configura(soloConsentiti(dati));
        registra('AI_CONFIG_UPDATED', { fornitore: salvata.fornitore, jarvis: salvata.jarvis });
        return salvata;
    }),
    getStatus: (event, dati = {}) => alConfine(() => gateway().stato(dati && dati.fornitore)),
    listModels: (event, dati = {}) => alConfine(() => gateway().modelli(dati && dati.fornitore)),
    saveApiKey: (event, dati = {}) => alConfine(() => {
        const esito = gateway().salvaChiave(dati.fornitore, dati.chiave);
        registra('AI_API_KEY_SAVED', { fornitore: dati.fornitore });
        return esito;
    }),
    removeApiKey: (event, dati = {}) => alConfine(() => {
        const esito = gateway().rimuoviChiave(dati.fornitore);
        registra('AI_API_KEY_REMOVED', { fornitore: dati.fornitore });
        return esito;
    }),
    getJarvisState: () => alConfine(() => gateway().statoJarvis(puoDecidere())),
    setJarvisState: (event, dati = {}) => alConfine(() => {
        const salvata = gateway().configura({ jarvis: dati && dati.stato });
        registra('AI_JARVIS_STATE', { jarvis: salvata.jarvis });
        if (salvata.jarvis === 'disattivo') gateway().memoria('libera').catch(errore => console.warn('[AI] Modello non liberato:', errore.message));
        return gateway().statoJarvis(true);
    }),
    loadModel: () => alConfine(() => gateway().memoria('carica')),
    releaseModel: () => alConfine(() => gateway().memoria('libera'))
};
