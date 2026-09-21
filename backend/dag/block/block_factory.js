'use strict';
const { computeBlockId } = require('./block_hasher');
const { normalizePayload } = require('./block_codec');
const { validatePayloadSchema } = require('../schema/payload_validator');
const { getCurrentTips, updateTips } = require('../graph/dag_tips');
const { getNodeId } = require('../../core/node_identity');
const { CURRENT_PAYLOAD_VERSION } = require('../schema/schema_registry');
const bus = require('../../core/event_bus');
const DeveloperVault = require('../../security/developer_vault');
function createBlock(eventType, tableName, recordId, payload) {
    try {
        const norm = normalizePayload(payload);
        
        if (eventType === 'COMPUTE') {
            const smartVm = require('../compute/smart_contract_vm');
            if (!smartVm.validateComputeBlock(norm.code, norm, norm.expectedOutput)) {
                console.warn(`[BlockFactory] Consenso deterministico fallito per lo Smart Contract.`);
                return null;
            }
        } else if (!validatePayloadSchema(tableName, eventType, norm)) {
            console.warn(`[BlockFactory] Schema non valido per ${tableName}`);
            return null;
        }
        const db = require('../../db').getDB('ledger');
        const nodeId = getNodeId();
        
        const hlc = require('../application/hlc');
        const createdAt = hlc.now();
        
        const parentIds = getCurrentTips(db);
        
        const roleKeystore = require('../../security/role_keystore');
        const payloadBuffer = Buffer.from(JSON.stringify(norm), 'utf8');
        const encryptedPayloadHex = roleKeystore.encryptPayload(tableName, payloadBuffer).toString('hex');
        
        const blockId = computeBlockId(parentIds, nodeId, createdAt, eventType, tableName, recordId, norm, CURRENT_PAYLOAD_VERSION);
        const existing = db.query('SELECT block_id FROM event_log WHERE block_id = ?', [blockId]);
        
        if (existing && existing.length > 0) return null;
        
        const signer = require('./block_signer');
        try { signer.ensureSelfKey(); } catch (_) {}
        let signature = '';
        try { signature = signer.signBlock({ block_id: blockId }); } catch (_) {}
        
        db.run(
            'INSERT INTO event_log (block_id, parent_ids, event_type, table_name, record_id, payload, node_id, created_at, payload_version, is_applied, signature, received_at, validity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
            [blockId, JSON.stringify(parentIds), eventType, tableName, String(recordId), encryptedPayloadHex, nodeId, createdAt, CURRENT_PAYLOAD_VERSION, signature, Date.now(), 'valid']
        );
        updateTips(db, parentIds, blockId);
        require('../../db').saveDB('ledger');
        const block = { block_id: blockId, parent_ids: parentIds, event_type: eventType, table_name: tableName, record_id: String(recordId), payload: norm, node_id: nodeId, created_at: createdAt, payload_version: CURRENT_PAYLOAD_VERSION, signature };
        try { require('../sync/outbox').enqueue(block); } catch (_) {}
        DeveloperVault.logMutation(block).catch(()=>{});
        bus.publish('block:created', block);
        return block;
    } catch (e) {
        console.error('[BlockFactory] createBlock error:', e.message);
        return null;
    }
}
module.exports = { createBlock };
