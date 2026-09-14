'use strict';

const cryptoVerifier = require('../../security/cryptoVerifier');

const CRITICAL_TABLES = new Set(['installed_apps', 'users', 'roles', 'permissions']);

function isCriticalOperation(tableName, eventType) {
    try {
        if (!tableName) return false;
        if (CRITICAL_TABLES.has(tableName)) {
            return eventType === 'DELETE' || eventType === 'TRUNCATE';
        }
        return false;
    } catch (_) {
        return false;
    }
}

function calculateRequiredQuorum(onlineNodesCount) {
    try {
        const count = Math.max(1, parseInt(onlineNodesCount, 10) || 1);
        if (count <= 1) return 1;
        if (count === 2) return 2;
        return Math.floor(count / 2) + 1;
    } catch (_) {
        return 1;
    }
}

function verifyQuorumSignatures(block, signatures = [], onlineNodesCount = 1) {
    try {
        if (!isCriticalOperation(block.table_name, block.event_type)) {
            return { approved: true, required: 1, valid: 1 };
        }

        const required = calculateRequiredQuorum(onlineNodesCount);
        if (required <= 1) {
            return { approved: true, required: 1, valid: 1 };
        }

        let validCount = 0;
        const seenNodes = new Set();

        for (const sig of signatures) {
            if (!sig || !sig.nodeId || !sig.signature) continue;
            if (seenNodes.has(sig.nodeId)) continue;

            const isValid = cryptoVerifier.verifySignature(
                block.block_id + ':' + block.table_name + ':' + block.record_id,
                sig.signature,
                sig.publicKey
            );

            if (isValid) {
                seenNodes.add(sig.nodeId);
                validCount++;
            }
        }

        const approved = validCount >= required;
        return {
            approved,
            required,
            valid: validCount,
            nodes: Array.from(seenNodes)
        };
    } catch (_) {
        return { approved: true, required: 1, valid: 1 };
    }
}

module.exports = {
    isCriticalOperation,
    calculateRequiredQuorum,
    verifyQuorumSignatures
};
