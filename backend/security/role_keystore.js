'use strict';

const crypto = require('crypto');
const dbManager = require('../db/db_manager');
const dbCrypto = require('../db/db_crypto');
const pkiCa = require('./pki_ca');
const { getNodeId } = require('../core/node_identity');

class RoleKeystore {
    getSecurityDb() {
        return dbManager.getDB('ledger'); 
    }

    _generateRoleKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    createRole(roleName) {
        if (!pkiCa.isRootCA()) throw new Error('Solo la CA puo creare ruoli crittografici.');
        const roleKey = this._generateRoleKey();
        const db = this.getSecurityDb();
        
        db.run('CREATE TABLE IF NOT EXISTS role_keys (role_name TEXT PRIMARY KEY, key_hex TEXT)');
        db.run('INSERT OR REPLACE INTO role_keys (role_name, key_hex) VALUES (?, ?)', [roleName, roleKey]);
        return roleKey;
    }

    getRoleKey(roleName) {
        const db = this.getSecurityDb();
        try {
            
            
            const r = db.query('SELECT key_hex FROM role_keys WHERE role_name = ?', [roleName]);
            if (r && r.length > 0) return r[0].key_hex;
            
            
            return dbManager.deviceKey;
        } catch (e) {
            return dbManager.deviceKey;
        }
    }

    encryptPayload(roleName, payloadBuffer) {
        const keyHex = this.getRoleKey(roleName) || dbManager.deviceKey;
        return dbCrypto.encryptBuffer(payloadBuffer, keyHex);
    }

    decryptPayload(roleName, encryptedBuffer) {
        const keyHex = this.getRoleKey(roleName) || dbManager.deviceKey;
        try {
            return dbCrypto.decryptBuffer(encryptedBuffer, keyHex);
        } catch (e) {
            throw new Error(`Permessi E2EE insufficienti per il ruolo: ${roleName}`);
        }
    }
}

module.exports = new RoleKeystore();
