'use strict';
const registry = require('../registry/network_registry');
const networkSession = require('../session/network_session');

function resolveCandidate() {
    const candidati = registry.list().filter(entry => entry.autoStart !== false && entry.sealedCode);
    if (candidati.length === 0) return null;
    return candidati[0];
}

async function activateOnBoot() {
    if (networkSession.isActive()) return null;
    const entry = resolveCandidate();
    if (!entry) return null;
    const code = registry.resolveStoredCode(entry);
    if (!code) {
        console.warn(`[NetworkAutostart] Codice non recuperabile per "${entry.name}": apertura automatica saltata.`);
        return null;
    }
    try {
        const activator = require('./network_activator');
        const descriptor = await activator.activate(entry.id, code);
        console.log(`[NetworkAutostart] Rete "${entry.name}" aperta automaticamente all'avvio.`);
        return descriptor;
    } catch (e) {
        console.error(`[NetworkAutostart] Apertura automatica di "${entry.name}" non riuscita:`, e.message);
        return null;
    }
}

function setAutoStart(networkId, enabled) {
    return registry.update(networkId, () => ({ autoStart: enabled === true }));
}

module.exports = { activateOnBoot, resolveCandidate, setAutoStart };
