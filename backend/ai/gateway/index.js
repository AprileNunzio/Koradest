'use strict';

const path = require('path');
const { creaGateway } = require('./gateway_ai');
const { creaCassaforte } = require('./cassaforte_chiavi');
const { creaConfigurazione } = require('./configurazione_ai');
const { creaApprendimento } = require('./apprendimento');
const { creaArchivioCifrato } = require('./apprendimento/archivio_cifrato');
const { creaScaricamenti } = require('./scaricamenti');
const fornitori = require('./fornitori');

let istanza = null;
let gestoreScaricamenti = null;

function scaricamenti() {
    if (gestoreScaricamenti) return gestoreScaricamenti;
    const { BrowserWindow } = require('electron');
    gestoreScaricamenti = creaScaricamenti({
        notifica: evento => BrowserWindow.getAllWindows().forEach(finestra => finestra.webContents.send('ai:scaricamento', evento))
    });
    return gestoreScaricamenti;
}

function gateway() {
    if (istanza) return istanza;
    const { app, safeStorage } = require('electron');
    const configHandlers = require('../../config');
    const { toolRegistry, rbacGuard, dataProtector } = require('../ollama');
    const auditLogger = require('../../observability/auditLogger');
    const cartella = path.join(app.getPath('userData'), 'ai');
    istanza = creaGateway({
        configurazione: creaConfigurazione({ leggiConfig: () => configHandlers.readConfig(), aggiornaSezione: (nome, modifica) => configHandlers.aggiornaSezione(nome, modifica) }),
        cassaforte: creaCassaforte({ cifratore: safeStorage, percorso: path.join(cartella, 'chiavi.json') }),
        fornitori,
        hostOllama: () => {
            const config = configHandlers.readConfig() || {};
            return (config.ollama && config.ollama.host) || 'http://127.0.0.1:11434';
        },
        toolRegistry,
        rbacGuard,
        dataProtector,
        broker: require('../../security/capabilityBroker'),
        audit: (...argomenti) => auditLogger.logEvent(...argomenti),
        apprendimento: creaApprendimento({
            archivio: creaArchivioCifrato({ cifratore: safeStorage, percorso: path.join(cartella, 'esperienza.bin') }),
            dataProtector,
            generaId: () => require('crypto').randomUUID()
        }),
        scaricamenti: scaricamenti()
    });
    return istanza;
}

module.exports = { gateway, scaricamenti, creaGateway };
