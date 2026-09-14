'use strict';
const quorumPolicy = require('./quorum_policy');
const networkSession = require('../session/network_session');

function _connectedPeers() {
    try {
        return require('../../p2p/index').getConnectedNodesCount() || 0;
    } catch (_) {
        return 0;
    }
}

function evaluate() {
    if (!networkSession.isActive()) {
        return { active: false, satisfied: false, blocking: true, required: 0, current: 0, enforcement: 'hard', reason: 'NETWORK_NOT_ACTIVE' };
    }
    const policy = quorumPolicy.getPolicy();
    const current = _connectedPeers() + 1;
    const required = policy.minNodes;
    const satisfied = current >= required;
    return {
        active: true,
        satisfied,
        blocking: policy.enforcement === 'hard' && !satisfied,
        warning: policy.enforcement === 'soft' && !satisfied,
        required,
        current,
        missing: satisfied ? 0 : required - current,
        enforcement: policy.enforcement,
        graceMs: policy.graceMs,
        reason: satisfied ? null : 'QUORUM_NOT_REACHED'
    };
}

function describe(state) {
    if (!state.active) return 'Nessuna rete attiva su questa postazione.';
    if (state.satisfied) return `Quorum raggiunto: ${state.current}/${state.required} nodi attivi.`;
    if (state.enforcement === 'hard') {
        return `Accesso bloccato dall'amministratore: servono almeno ${state.required} nodi collegati, attualmente ne risultano ${state.current}.`;
    }
    return `Quorum non raggiunto: ${state.current}/${state.required} nodi attivi.`;
}

module.exports = { evaluate, describe };
