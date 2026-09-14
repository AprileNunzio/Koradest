'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const dbManager = require('./db/db_manager');
const { deriveKeyForPurpose } = require('./security/network_key_derivation');

function hashNetworkCode(code) {
    try {
        return deriveKeyForPurpose(code, 'network-membership-hash');
    } catch (e) {
        return '';
    }
}

function generateNetworkCode() {
    try {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 9; i++) code += chars.charAt(crypto.randomInt(0, chars.length));
        return `${code.slice(0,3)}-${code.slice(3,6)}-${code.slice(6)}`;
    } catch (e) {
        return '';
    }
}

function checkIsRegistered() {
    try {
        if (!require('./networks/session/network_session').isActive()) return false;
        return dbManager.isRegistered();
    } catch (e) {
        return false;
    }
}

function getDB(domain = 'auth') {
    try {
        return dbManager.getDB(domain);
    } catch (e) {
        throw e;
    }
}

async function saveDB(domain = null, immediate = false) {
    try {
        if (domain) {
            await dbManager.saveDatabase(domain, immediate);
        } else {
            await dbManager.saveAll(immediate);
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function forceResetDB() {
    try {
        return await dbManager.reset();
    } catch (e) {
        return false;
    }
}

async function getNodeId() {
    try {
        const configDb = dbManager.getDB('config');
        const res = await configDb.query("SELECT key_value FROM network_config WHERE key_name = 'node_id'");
        if (res && res.length > 0) return res[0].key_value;
        return null;
    } catch (e) {
        return null;
    }
}

async function getNetworkCodeHash() {
    try {
        const sessionHash = require('./networks/session/network_session').getActiveMembershipHash();
        if (sessionHash) return sessionHash;
        const configDb = dbManager.getDB('config');
        const res = await configDb.query("SELECT key_value FROM network_config WHERE key_name = 'network_code_hash'");
        if (res && res.length > 0) return res[0].key_value;
        return null;
    } catch (e) {
        return null;
    }
}

function _isSafeIdentifier(name) {
    try {
        return typeof name === 'string' && /^[a-z_][a-z0-9_]{0,62}$/i.test(name);
    } catch (e) {
        return false;
    }
}

async function getRowsSince(domain, tableName, timestamp) {
    try {
        if (!_isSafeIdentifier(tableName)) return [];
        const db = dbManager.getDB(domain);
        return await db.query(`SELECT * FROM ${tableName} WHERE last_modified > ?`, [timestamp]);
    } catch (e) {
        return [];
    }
}

async function upsertRows(domain, tableName, rows) {
    try {
        if (!rows || rows.length === 0) return;
        if (!_isSafeIdentifier(tableName)) return;
        const db = dbManager.getDB(domain);
        await db.execute('BEGIN TRANSACTION;');
        let changesMade = false;
        for (const row of rows) {
            try {
                const id = row.id;
                const res = await db.query(`SELECT last_modified FROM ${tableName} WHERE id = ?`, [id]);
                let shouldInsert = false;
                let shouldUpdate = false;
                if (res.length > 0) {
                    if (row.last_modified > res[0].last_modified) shouldUpdate = true;
                } else {
                    shouldInsert = true;
                }
                if (shouldInsert || shouldUpdate) {
                    const columns = Object.keys(row).filter(_isSafeIdentifier);
                    const values = columns.map(c => row[c]);
                    const placeholders = columns.map(() => '?').join(', ');
                    if (shouldInsert) {
                        await db.execute(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`, values);
                    } else {
                        const setClause = columns.map(c => `${c} = ?`).join(', ');
                        await db.execute(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`, [...values, id]);
                    }
                    changesMade = true;
                }
            } catch (err) {}
        }
        await db.execute('COMMIT;');
        if (changesMade) await dbManager.saveDatabase(domain);
    } catch (e) {
        try { const db = dbManager.getDB(domain); await db.execute('ROLLBACK;'); } catch (_) {}
    }
}

function notifyDataChanged(tableName, modifiedRows) {
    try {
        const { triggerLegacyPush } = require('./sync_engine');
        if (typeof triggerLegacyPush === 'function') triggerLegacyPush(tableName, modifiedRows);
        const { BrowserWindow } = require('electron');
        if (BrowserWindow) {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed()) w.webContents.send('sync-updated', { table: tableName });
            });
        }
        if (tableName === 'installed_apps') {
            const store = require('./handlers/store');
            if (typeof store.syncNetworkApps === 'function') {
                store.syncNetworkApps().catch(e => {});
            }
        }
    } catch (e) {}
}

function wrapMutationWithEvent(eventType, tableName, recordId, payload) {
    try {
        const { createBlock } = require('./blockchain');
        const block = createBlock(eventType, tableName, String(recordId), payload);
        if (!block) return;
        try {
            const { triggerEventDrivenPush } = require('./sync_engine');
            triggerEventDrivenPush(block);
        } catch (pushErr) {}
    } catch (e) {}
}

function backupAllDatabases() {
    try {
        const dbDir = dbManager.basePath;
        if (!dbDir || !fs.existsSync(dbDir)) return false;
        const backupDir = path.join(dbDir, 'db_backups', new Date().toISOString().split('T')[0]);
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.enc'));
        for (const f of files) {
            try {
                fs.copyFileSync(path.join(dbDir, f), path.join(backupDir, f));
            } catch (eCopy) {
                console.error('[Backup] Copia non riuscita per ' + f + ':', eCopy.message);
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

function verifyDatabasesIntegrity() {
    try {
        const domains = ['auth', 'config', 'ledger', 'app', 'store', 'anagrafica', 'azienda', 'audit'];
        const results = {};
        for (const domain of domains) {
            try {
                const db = dbManager.getDB(domain);
                if (db && typeof db.query === 'function') {
                    const res = db.query('PRAGMA integrity_check');
                    results[domain] = res && res[0] ? (res[0].integrity_check || res[0]['PRAGMA integrity_check']) : 'ok';
                }
            } catch (eDom) {
                results[domain] = eDom.message;
            }
        }
        return results;
    } catch (e) {
        return { error: e.message };
    }
}

module.exports = {
    checkIsRegistered,
    getDB,
    saveDB,
    hashNetworkCode,
    forceResetDB,
    getRowsSince,
    upsertRows,
    notifyDataChanged,
    wrapMutationWithEvent,
    getNodeId,
    getNetworkCodeHash,
    backupAllDatabases,
    verifyDatabasesIntegrity
};
