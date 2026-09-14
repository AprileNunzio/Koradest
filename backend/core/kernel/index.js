'use strict';

// API di sistema offerte dal kernel KORADEST a ogni applicazione caricata.
// Arrivano nel terzo argomento di registerBackendHandlers come `host.kernel`.
// Log, pianificazione, file e moduli sono sempre disponibili; email e notifiche
// richiedono il permesso "kernel:email" / "kernel:notifiche" nel manifest.

const logger = require('../../observability/logger');
const { pianificatore, prossimaEsecuzione } = require('./scheduler');
const kernelModules = require('./kernel_modules');
const { creaFileApp } = require('./app_files');

const VERSIONE_API = 1;
const GRAVITA = new Set(['info', 'warning', 'error']);

function haPermesso(manifest, permesso) {
    const dichiarati = Array.isArray(manifest.permissions)
        ? manifest.permissions
        : (manifest.core === true ? ['*'] : []);
    return dichiarati.some(scope => scope === '*' || scope === 'kernel:*' || scope === permesso);
}

function richiediPermesso(manifest, permesso) {
    if (!haPermesso(manifest, permesso)) {
        throw new Error(`L'applicazione ${manifest.id} non dichiara il permesso "${permesso}" nel manifest`);
    }
}

function notificationManager() {
    return require('../notificationManager');
}

function creaKernel(manifest) {
    const appId = manifest.id;
    const scrivi = livello => (messaggio, dettagli) =>
        logger.log(livello, `[${appId}] ${messaggio}`, { app: appId, ...(dettagli || {}) });

    return Object.freeze({
        versione: VERSIONE_API,
        log: Object.freeze({ info: scrivi('info'), warn: scrivi('warn'), error: scrivi('error') }),
        pianificazione: Object.freeze({
            pianifica: (nome, espressione, funzione) => pianificatore.pianifica(appId, nome, espressione, funzione),
            annulla: nome => pianificatore.annulla(appId, nome),
            elenco: () => pianificatore.elenco(appId),
            prossimaEsecuzione
        }),
        notifiche: Object.freeze({
            invia: async ({ userId, titolo, messaggio, gravita = 'info' } = {}) => {
                richiediPermesso(manifest, 'kernel:notifiche');
                if (!userId || !titolo) throw new Error('Una notifica richiede destinatario e titolo');
                return notificationManager().dispatch({
                    userId,
                    category: 'system',
                    title: `${manifest.name || appId}: ${titolo}`,
                    message: messaggio || '',
                    severity: GRAVITA.has(gravita) ? gravita : 'info',
                    metadata: { app: appId }
                });
            }
        }),
        email: Object.freeze({
            invia: async ({ a, oggetto, testo, html, allegati } = {}) => {
                richiediPermesso(manifest, 'kernel:email');
                return notificationManager().inviaEmail({ to: a, subject: oggetto, text: testo, html, attachments: allegati });
            }
        }),
        file: creaFileApp(manifest),
        moduli: Object.freeze({
            disponibili: () => kernelModules.pacchettiDelCore(),
            concessi: () => kernelModules.concessiA(appId)
        })
    });
}

function rilascia(appId) {
    pianificatore.annullaTutti(appId);
    kernelModules.rimuovi(appId);
}

module.exports = { creaKernel, rilascia, haPermesso, VERSIONE_API };
