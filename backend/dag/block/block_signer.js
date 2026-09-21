'use strict';

const keypair = require('../../security/node_keypair');
const pkiCa = require('../../security/pki_ca');

function _message(block) {
    return Buffer.from(String(block.block_id), 'utf8');
}

function signBlock(block) {
    return keypair.sign(_message(block));
}

function learnKey(nodeId, publicKeyPem, caSignature) {
    if (!nodeId || !publicKeyPem) return false;
    
    if (!caSignature || !pkiCa.verifyNodeCertificate(nodeId, publicKeyPem, caSignature)) {
        return false;
    }

    const db = require('../../db').getDB('ledger');
    const now = Date.now();
    
    db.run(`
        CREATE TABLE IF NOT EXISTS node_keys (
            node_id TEXT PRIMARY KEY,
            public_key TEXT,
            ca_signature TEXT,
            is_ca INTEGER DEFAULT 0,
            first_seen INTEGER,
            last_seen INTEGER
        )
    `);

    db.run('INSERT OR REPLACE INTO node_keys (node_id, public_key, ca_signature, is_ca, first_seen, last_seen) VALUES (?, ?, ?, 0, ?, ?)', 
        [nodeId, publicKeyPem, caSignature, now, now]);
        
    require('../../db').saveDB('ledger');
    return true;
}

function getKey(nodeId) {
    const db = require('../../db').getDB('ledger');
    try {
        const r = db.query('SELECT public_key FROM node_keys WHERE node_id = ?', [nodeId]);
        return (r && r.length > 0) ? r[0].public_key : null;
    } catch (e) {
        return null;
    }
}

function ensureSelfKey() {
    const { getNodeId } = require('../../core/node_identity');
    return true;
}

function verifyBlock(block) {
    if (!block || !block.signature) return 'unsigned';
    const pub = getKey(block.node_id);
    if (!pub) return 'unknown_key';
    return keypair.verify(pub, _message(block), block.signature) ? 'valid' : 'invalid';
}

module.exports = { signBlock, verifyBlock, learnKey, getKey, ensureSelfKey };
