'use strict';

const { validateStructure, validateIntegrity, validateSchema } = require('../block/block_validator');
const { normalizePayload } = require('../block/block_codec');
const { updateTips } = require('../graph/dag_tips');
const { isBlockKnown } = require('../graph/dag_store');
const { adaptPayload } = require('../schema/schema_migrator');
const { isTableSyncable, getDomainForTable } = require('../schema/schema_registry');
const { shouldApply } = require('./conflict_resolver');
const { mergeFieldDeltas } = require('./field_crdt_merger');
const bus = require('../../core/event_bus');


function isDomainZombie(domain) {
    try {
        if (!domain || !domain.startsWith('app_')) return false;
        const namespace = domain.replace(/^app_/, '');
        const coreNamespaces = new Set(['anagrafica', 'azienda', 'data', 'store', 'auth', 'config', 'ledger', 'audit']);
        if (coreNamespaces.has(namespace)) return false;

        const storeDb = require('../../db').getDB('store');
        if (!storeDb) return false;

        const rows = storeDb.query("SELECT app_id, is_deleted, status FROM installed_apps WHERE app_id = ?", [namespace]);
        if (!rows || rows.length === 0) return true;
        const appRow = rows[0];
        return Boolean(appRow.is_deleted === 1 || appRow.status === 'uninstalled');
    } catch (_) {
        return false;
    }
}

function _applyToTable(db, eventType, tableName, recordId, payload, createdAt) {
    try {
        if (!isTableSyncable(tableName) || !db) return false;
        if (require('../security/payload_shredder').isTombstone(payload)) return false;
        const tableInfo = db.query("PRAGMA table_info(" + tableName + ")");
        if (!tableInfo || tableInfo.length === 0) return false;
        const validCols = new Set(tableInfo.map(c => c.name));
        const safePayload = payload || {};
        let filtered = Object.fromEntries(Object.entries(safePayload).filter(([k]) => validCols.has(k)));
        if (validCols.has('id') && !filtered.id) filtered.id = recordId;

        const pkCols = tableInfo.filter(c => c.pk > 0).map(c => c.name);
        const whereCols = pkCols.length > 0 ? pkCols : (validCols.has('id') ? ['id'] : Object.keys(filtered));
        const whereClause = whereCols.map(c => c + " = ?").join(' AND ');
        const whereValues = whereCols.map(c => filtered[c] !== undefined ? filtered[c] : recordId);

        if (eventType === 'DELETE') {
            const ex = db.query("SELECT last_modified FROM " + tableName + " WHERE " + whereClause, whereValues);
            if (ex && ex.length > 0 && createdAt > (ex[0].last_modified || 0)) {
                if (validCols.has('is_deleted')) {
                    db.run("UPDATE " + tableName + " SET is_deleted = 1, last_modified = ? WHERE " + whereClause, [createdAt, ...whereValues]);
                } else {
                    db.run("DELETE FROM " + tableName + " WHERE " + whereClause, whereValues);
                }
            }
            return true;
        }
        const existing = db.query("SELECT * FROM " + tableName + " WHERE " + whereClause, whereValues);
        if (existing && existing.length > 0) {
            const { mergedRecord, changedFields } = mergeFieldDeltas(existing[0], filtered, createdAt, existing[0].last_modified || 0, pkCols);
            const updateCols = changedFields.filter(c => !pkCols.includes(c));
            if (updateCols.length > 0) {
                db.run("UPDATE " + tableName + " SET " + updateCols.map(c => c + " = ?").join(', ') + " WHERE " + whereClause, [...updateCols.map(c => mergedRecord[c]), ...whereValues]);
            }
        } else {

            const cols = Object.keys(filtered);
            if (cols.length > 0) {
                db.run("INSERT OR IGNORE INTO " + tableName + " (" + cols.join(', ') + ") VALUES (" + cols.map(() => '?').join(', ') + ")", Object.values(filtered));
            }
        }
        return true;
    } catch (_) {
        return false;
    }
}

function _applicaShred(block, norm) {
    try {
        const ledger = require('../../db').getDB('ledger');
        if (!isBlockKnown(block.block_id)) {
            ledger.run(
                'INSERT OR IGNORE INTO event_log (block_id, parent_ids, event_type, table_name, record_id, payload, node_id, created_at, payload_version, is_applied, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
                [block.block_id, JSON.stringify(block.parent_ids), block.event_type, block.table_name, String(block.record_id), JSON.stringify(norm), block.node_id, block.created_at, block.payload_version || 1, block.signature || '']
            );
            const parentIds = Array.isArray(block.parent_ids) ? block.parent_ids : JSON.parse(block.parent_ids);
            updateTips(ledger, parentIds, block.block_id);
        }
        const esito = require('../../security/gdpr/subject_eraser').applyRemoteShred(norm);
        require('../../db').saveDB('ledger');
        bus.publish('gdpr:shred-applied', { blockId: block.block_id, soggetto: norm && norm.subject_id, cancellati: esito.cancellati });
        return true;
    } catch (e) {
        console.error('[BlockApplier] Applicazione della cancellazione GDPR non riuscita:', e.message);
        return false;
    }
}

function applyBlock(block) {
    try {
        if (!validateStructure(block)) return false;
        const norm = normalizePayload(block.payload);
        const enriched = { ...block, payload: norm };
        if (block.event_type === 'SHRED') {
            if (!validateIntegrity(enriched)) return false;
            return _applicaShred(block, norm);
        }
        if (require('../security/payload_shredder').isTombstone(norm)) return true;
        if (!validateSchema(enriched)) {
            bus.publish('block:schema-error', { blockId: block.block_id, table: block.table_name, nodeId: block.node_id });
            return false;
        }
        if (!validateIntegrity(enriched)) return false;
        if (!isTableSyncable(block.table_name)) return false;
        if (isBlockKnown(block.block_id)) return true;

        const domain = getDomainForTable(block.table_name);
        if (isDomainZombie(domain)) {
            const ledger = require('../../db').getDB('ledger');
            if (ledger) {
                ledger.run(
                    'INSERT OR IGNORE INTO event_log (block_id, parent_ids, event_type, table_name, record_id, payload, node_id, created_at, payload_version, is_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
                    [block.block_id, JSON.stringify(block.parent_ids), block.event_type, block.table_name, String(block.record_id), JSON.stringify(norm), block.node_id, block.created_at, block.payload_version || 1]
                );
                const parentIds = Array.isArray(block.parent_ids) ? block.parent_ids : JSON.parse(block.parent_ids);
                updateTips(ledger, parentIds, block.block_id);
                require('../../db').saveDB('ledger');
            }
            bus.publish('block:zombie-skipped', { blockId: block.block_id, table: block.table_name, domain });
            return true;
        }

        const ledger = require('../../db').getDB('ledger');
        const dataDb = require('../../db').getDB(domain);
        const config = require('../../db').getDB('config');
        if (!dataDb) return false;
        const adapted = adaptPayload(block.table_name, block.payload_version || 1, norm);

        ledger.execute('BEGIN TRANSACTION;');
        dataDb.execute('BEGIN TRANSACTION;');
        config.execute('BEGIN TRANSACTION;');
        try {
            ledger.run(
                'INSERT OR IGNORE INTO event_log (block_id, parent_ids, event_type, table_name, record_id, payload, node_id, created_at, payload_version, is_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
                [block.block_id, JSON.stringify(block.parent_ids), block.event_type, block.table_name, String(block.record_id), JSON.stringify(norm), block.node_id, block.created_at, block.payload_version || 1]
            );
            const applied = _applyToTable(dataDb, block.event_type, block.table_name, block.record_id, adapted, block.created_at);
            if (applied) ledger.run('UPDATE event_log SET is_applied = 1 WHERE block_id = ?', [block.block_id]);
            const parentIds = Array.isArray(block.parent_ids) ? block.parent_ids : JSON.parse(block.parent_ids);
            updateTips(ledger, parentIds, block.block_id);
            try { config.run('INSERT OR REPLACE INTO node_registry (node_id, protocol_version, app_version, last_seen) VALUES (?, ?, ?, ?)', [block.node_id, block.payload_version || 1, '0.0.0', Date.now()]); } catch (_) {}
            ledger.execute('COMMIT;');
            dataDb.execute('COMMIT;');
            config.execute('COMMIT;');
        } catch (e) {
            try { ledger.execute('ROLLBACK;'); } catch (_) {}
            try { dataDb.execute('ROLLBACK;'); } catch (_) {}
            try { config.execute('ROLLBACK;'); } catch (_) {}
            throw e;
        }
        require('../../db').saveDB('ledger');
        require('../../db').saveDB(domain);
        require('../../db').saveDB('config');
        require('../../db').notifyDataChanged(block.table_name, 1);

        if (block.table_name === 'installed_apps') {
            try {
                const clusterAppLifecycle = require('../../core/clusterAppLifecycle');
                const isUninstall = block.event_type === 'DELETE' || (adapted && (adapted.is_deleted === 1 || adapted.status === 'uninstalled'));
                if (isUninstall) {
                    clusterAppLifecycle.handleRemoteAppUninstall(block.record_id || (adapted && adapted.app_id));
                } else if (adapted && adapted.status === 'active' && !adapted.is_deleted) {
                    clusterAppLifecycle.handleRemoteAppInstallOrUpdate(adapted);
                }
            } catch (_) {}
        }
        bus.publish('block:applied', { blockId: block.block_id, table: block.table_name, event: block.event_type, recordId: block.record_id, nodeId: block.node_id });
        return true;
    } catch (e) {
        return false;
    }
}

function reapplyToTables(block) {
    try {
        if (!validateStructure(block)) return false;
        if (block.event_type === 'SHRED') return true;
        const norm = normalizePayload(block.payload);
        if (require('../security/payload_shredder').isTombstone(norm)) return true;
        const enriched = { ...block, payload: norm };
        if (!validateSchema(enriched)) return false;
        if (!isTableSyncable(block.table_name)) return false;
        const domain = getDomainForTable(block.table_name);
        if (isDomainZombie(domain)) return true;

        const dataDb = require('../../db').getDB(domain);
        if (!dataDb) return false;
        const adapted = adaptPayload(block.table_name, block.payload_version || 1, norm);
        const applied = _applyToTable(dataDb, block.event_type, block.table_name, block.record_id, adapted, block.created_at);
        if (applied && block.table_name === 'installed_apps') {
            try {
                const clusterAppLifecycle = require('../../core/clusterAppLifecycle');
                const isUninstall = block.event_type === 'DELETE' || (adapted && (adapted.is_deleted === 1 || adapted.status === 'uninstalled'));
                if (isUninstall) {
                    clusterAppLifecycle.handleRemoteAppUninstall(block.record_id || (adapted && adapted.app_id));
                } else if (adapted && adapted.status === 'active' && !adapted.is_deleted) {
                    clusterAppLifecycle.handleRemoteAppInstallOrUpdate(adapted);
                }
            } catch (_) {}
        }
        return applied;
    } catch (e) {
        return false;
    }
}

module.exports = { applyBlock, reapplyToTables, isDomainZombie };
