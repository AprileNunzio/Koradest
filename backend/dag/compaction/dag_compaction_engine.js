'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbManager = require('../../db/db_manager');
const { getTips } = require('../graph/dag_tips');
const bus = require('../../core/event_bus');

const SAFE_CHECKPOINT_DEPTH = 500;
const COMPACTION_THRESHOLD = 2000;

function getLedgerDB() {
    try {
        return dbManager.getDB('ledger');
    } catch (_) {
        return null;
    }
}

function getCheckpointFile() {
    try {
        dbManager.initPaths();
        return path.join(dbManager.basePath || '', 'ledger_checkpoint.enc');
    } catch (_) {
        return null;
    }
}

function computeStateChecksum() {
    try {
        const ledger = getLedgerDB();
        if (!ledger) return null;
        const rows = ledger.query('SELECT block_id, created_at, table_name, record_id FROM event_log WHERE is_applied = 1 ORDER BY created_at ASC, block_id ASC') || [];
        if (rows.length === 0) return 'empty';
        const hash = crypto.createHash('sha256');
        for (const r of rows) {
            hash.update(r.block_id + ':' + r.created_at + ':' + r.table_name + ':' + r.record_id + ';');
        }
        return hash.digest('hex');
    } catch (_) {
        return null;
    }
}

async function createEpochCheckpoint() {
    try {
        const ledger = getLedgerDB();
        if (!ledger) return { success: false, error: 'Ledger non disponibile' };

        const countRow = ledger.query('SELECT COUNT(*) as total FROM event_log');
        const total = (countRow && countRow[0] && countRow[0].total) || 0;
        if (total < COMPACTION_THRESHOLD) {
            return { success: true, compacted: false, message: 'Compattazione non necessaria (eventi: ' + total + ')' };
        }

        const tips = getTips(ledger);
        const stateHash = computeStateChecksum();
        const cutoffTime = Math.floor(Date.now() / 1000) - (86400 * 7);

        const pruneCandidates = ledger.query(
            'SELECT block_id FROM event_log WHERE is_applied = 1 AND created_at < ? ORDER BY created_at ASC LIMIT ?',
            [cutoffTime, total - SAFE_CHECKPOINT_DEPTH]
        ) || [];

        if (pruneCandidates.length === 0) {
            return { success: true, compacted: false, message: 'Nessun blocco idoneo per il pruning' };
        }

        const checkpointData = {
            version: 1,
            createdAt: Date.now(),
            stateChecksum: stateHash,
            tips,
            compactedBlockCount: pruneCandidates.length
        };

        const targetFile = getCheckpointFile();
        if (targetFile) {
            fs.writeFileSync(targetFile, JSON.stringify(checkpointData), 'utf8');
        }

        const ids = pruneCandidates.map(c => c.block_id);
        const placeholders = ids.map(() => '?').join(',');

        ledger.execute('BEGIN TRANSACTION;');
        try {
            ledger.run('DELETE FROM event_log WHERE block_id IN (' + placeholders + ')', ids);
            ledger.execute('COMMIT;');
        } catch (e) {
            try { ledger.execute('ROLLBACK;'); } catch (_) {}
            throw e;
        }

        await dbManager.saveDatabase('ledger');
        bus.publish('dag:compacted', { compacted: ids.length, stateHash });

        return {
            success: true,
            compacted: true,
            prunedBlocks: ids.length,
            remainingBlocks: total - ids.length,
            stateHash
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getLatestCheckpointInfo() {
    try {
        const targetFile = getCheckpointFile();
        if (!targetFile || !fs.existsSync(targetFile)) return null;
        return JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    } catch (_) {
        return null;
    }
}

module.exports = {
    createEpochCheckpoint,
    computeStateChecksum,
    getLatestCheckpointInfo
};
