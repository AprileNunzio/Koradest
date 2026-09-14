'use strict';
const crypto = require('crypto');
const dbManager = require('../../db/db_manager');
const identity = require('../registry/network_identity');
const registry = require('../registry/network_registry');

function generateNetworkCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 9; i++) code += chars.charAt(crypto.randomInt(0, chars.length));
    return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`;
}

function bindWorkspace(entry, rawCode) {
    const ident = identity.identityOf(rawCode);
    dbManager.setWorkspace(registry.workspacePathOf(entry));
    if (!dbManager.setDeviceKey(ident.dbKey)) {
        const err = new Error('NETWORK_KEY_INVALID');
        err.isExpected = true;
        throw err;
    }
    return ident;
}

async function seedConfig(ident, networkName) {
    const configDb = dbManager.getDB('config');
    const nodeId = crypto.randomBytes(16).toString('hex');
    const rows = [
        ['network_name', networkName],
        ['network_code', ident.code],
        ['network_code_hash', ident.membershipHash],
        ['network_public_id', ident.publicId]
    ];
    for (const [key, value] of rows) {
        await configDb.execute('INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)', [key, value]);
    }
    const existing = await configDb.query("SELECT key_value FROM network_config WHERE key_name = 'node_id'");
    if (!existing || existing.length === 0) {
        await configDb.execute('INSERT INTO network_config (key_name, key_value) VALUES (?, ?)', ['node_id', nodeId]);
    }
    await dbManager.saveAll(true);
}

async function provisionEmpty(entry, rawCode, networkName) {
    const ident = bindWorkspace(entry, rawCode);
    await dbManager.reset();
    await dbManager.openAll();
    await seedConfig(ident, networkName);
    return ident;
}

async function openExisting(entry, rawCode) {
    const ident = bindWorkspace(entry, rawCode);
    await dbManager.openAll();
    await seedConfig(ident, entry.name);
    return ident;
}

module.exports = { generateNetworkCode, bindWorkspace, provisionEmpty, openExisting, seedConfig };
