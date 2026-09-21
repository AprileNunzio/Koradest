'use strict';

const crypto = require('crypto');
const dbManager = require('../../db/db_manager');
const pkiCa = require('../../security/pki_ca');

class MerkleSnapshot {
    
    getSnapshotDb() {
        return dbManager.getDB('ledger');
    }

    createSignedSnapshot(blockIds, stateHash) {
        if (!pkiCa.isRootCA()) {
            throw new Error('Solo l\'amministratore (Root CA) puo generare Snapshot firmati.');
        }

        const snapshotData = {
            version: 1,
            type: 'epoch_snapshot',
            timestamp: Date.now(),
            compactedBlocks: blockIds,
            stateHash: stateHash
        };

        const payloadStr = JSON.stringify(snapshotData);
        const signature = crypto.sign('sha256', Buffer.from(payloadStr), crypto.createPrivateKey(pkiCa.caPrivateKey)).toString('hex');
        
        return {
            payload: snapshotData,
            signature: signature,
            signerId: require('../../core/node_identity').getNodeId()
        };
    }

    verifySnapshot(snapshot) {
        if (!snapshot || !snapshot.signature || !snapshot.payload) return false;
        
        const db = this.getSnapshotDb();
        const r = db.query("SELECT public_key FROM node_keys WHERE node_id = ? AND is_ca = 1", [snapshot.signerId]);
        if (r.length === 0) return false;

        const caPubKey = r[0].public_key;
        const payloadStr = JSON.stringify(snapshot.payload);
        
        return crypto.verify('sha256', Buffer.from(payloadStr), caPubKey, Buffer.from(snapshot.signature, 'hex'));
    }
}

module.exports = new MerkleSnapshot();
