'use strict';
const fs = require('fs');
const path = require('path');
const dbManager = require('../../db/db_manager');
const deviceKey = require('../../db/device_key');
const registry = require('../registry/network_registry');
const identity = require('../registry/network_identity');

function detectLegacyWorkspace() {
    try {
        const { app } = require('electron');
        const marker = path.join(app.getPath('userData'), 'active_node.json');
        if (!fs.existsSync(marker)) return null;
        const parsed = JSON.parse(fs.readFileSync(marker, 'utf8'));
        const node = parsed && parsed.node ? String(parsed.node).replace(/[^a-zA-Z0-9_-]/g, '') : '';
        if (!node) return null;
        const workspace = path.join(app.getPath('userData'), 'dbs', node);
        if (!fs.existsSync(path.join(workspace, 'config.enc'))) return null;
        return { node, workspace };
    } catch (_) {
        return null;
    }
}

async function _readLegacyConfig(workspace, keyHex) {
    dbManager.setWorkspace(workspace);
    if (!dbManager.setDeviceKey(keyHex)) return null;
    await dbManager.loadDatabase('config', require('../../migrations/config'));
    const db = dbManager.getDB('config');
    const codeRow = db.query("SELECT key_value FROM network_config WHERE key_name = 'network_code'");
    const nameRow = db.query("SELECT key_value FROM network_config WHERE key_name = 'network_name'");
    return {
        code: codeRow && codeRow.length > 0 ? codeRow[0].key_value : null,
        name: nameRow && nameRow.length > 0 ? nameRow[0].key_value : null
    };
}

async function importLegacyWorkspace() {
    if (registry.list().length > 0) return null;
    const legacy = detectLegacyWorkspace();
    if (!legacy) return null;
    const sealed = deviceKey.loadSealed();
    if (!sealed) return null;
    let config = null;
    try {
        config = await _readLegacyConfig(legacy.workspace, sealed);
    } catch (e) {
        console.error('[NetworkMigrator] Spazio di lavoro legacy non leggibile:', e.message);
    } finally {
        dbManager.closeAll();
    }
    if (!config || !identity.isValidCode(config.code)) return null;
    try {
        const entry = registry.create({
            name: identity.sanitizeName(config.name) || legacy.node,
            code: config.code,
            role: 'owner',
            remember: true,
            autoStart: true,
            slugOverride: legacy.node
        });
        console.log(`[NetworkMigrator] Rete legacy "${entry.name}" registrata nel vault multi-rete.`);
        return entry;
    } catch (e) {
        console.error('[NetworkMigrator] Registrazione rete legacy fallita:', e.message);
        return null;
    }
}

module.exports = { detectLegacyWorkspace, importLegacyWorkspace };
