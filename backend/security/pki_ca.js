'use strict';

const crypto = require('crypto');
const dbManager = require('../db/db_manager');
const nodeKeypair = require('./node_keypair');

class PKICertificateAuthority {
    
    getCaDb() {
        return dbManager.getDB('ledger'); 
    }

    _generateRootCa() {
        const caKeys = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return caKeys;
    }

    isRootCA() {
        const db = this.getCaDb();
        const r = db.query("SELECT * FROM node_keys WHERE is_ca = 1 LIMIT 1");
        if (r.length === 0) return false;
        
        
        const { getNodeId } = require('../core/node_identity');
        return r[0].node_id === getNodeId();
    }

    initializeRoot() {
        const db = this.getCaDb();
        const caKeys = this._generateRootCa();
        const { getNodeId } = require('../core/node_identity');
        const now = Date.now();

        
        const selfSignature = crypto.sign('sha256', Buffer.from(nodeKeypair.getPublicKeyPem()), crypto.createPrivateKey(caKeys.privateKey)).toString('hex');
        
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

        db.run('INSERT OR REPLACE INTO node_keys (node_id, public_key, ca_signature, is_ca, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)',
            [getNodeId(), nodeKeypair.getPublicKeyPem(), selfSignature, 1, now, now]);
        
        
        
        this.caPrivateKey = caKeys.privateKey;
    }

    generatePairingPIN() {
        if (!this.isRootCA()) throw new Error('Solo la Root CA puo generare un PIN di accoppiamento.');
        const pin = crypto.randomInt(100000, 999999).toString();
        
        
        return pin; 
    }

    signNodeCertificate(nodeId, nodePublicKeyPem, pin) {
        if (!this.isRootCA()) throw new Error('Non autorizzato');
        
        const signature = crypto.sign('sha256', Buffer.from(nodePublicKeyPem), crypto.createPrivateKey(this.caPrivateKey)).toString('hex');
        const db = this.getCaDb();
        const now = Date.now();
        db.run('INSERT OR REPLACE INTO node_keys (node_id, public_key, ca_signature, is_ca, first_seen, last_seen) VALUES (?, ?, ?, 0, ?, ?)',
            [nodeId, nodePublicKeyPem, signature, now, now]);
        return signature;
    }

    verifyNodeCertificate(nodeId, nodePublicKeyPem, caSignature) {
        const db = this.getCaDb();
        const caRow = db.query("SELECT public_key FROM node_keys WHERE is_ca = 1 LIMIT 1");
        if (caRow.length === 0) throw new Error('Root CA non trovata in questa rete');
        
        const caPublicPem = caRow[0].public_key;
        return crypto.verify('sha256', Buffer.from(nodePublicKeyPem), caPublicPem, Buffer.from(caSignature, 'hex'));
    }
}

module.exports = new PKICertificateAuthority();
