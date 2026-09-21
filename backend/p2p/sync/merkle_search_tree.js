'use strict';

const crypto = require('crypto');
const dbManager = require('../../db/db_manager');


class MerkleSearchTree {
    
    getMstDb() {
        return dbManager.getDB('ledger');
    }

    _hashNode(leftHash, key, rightHash) {
        return crypto.createHash('sha256')
            .update(`${leftHash || ''}:${key}:${rightHash || ''}`)
            .digest('hex');
    }

    _deterministicLevel(keyHex) {
        
        let level = 0;
        for (let i = 0; i < keyHex.length; i++) {
            if (keyHex[i] === '0') level++;
            else break;
        }
        return level;
    }

    async calculateRootHash() {
        const db = this.getMstDb();
        if (!db) return null;
        
        
        
        const row = db.query('SELECT block_id FROM event_log ORDER BY block_id DESC LIMIT 1');
        if (!row || row.length === 0) return 'empty_tree';

        
        const rowCount = db.query('SELECT COUNT(*) as c FROM event_log')[0].c;
        const lastBlockId = row[0].block_id;
        
        return crypto.createHash('sha256').update(`${rowCount}:${lastBlockId}`).digest('hex');
    }

    async getMissingBlocks(remoteRootHash, remoteBlockIdCursor) {
        const db = this.getMstDb();
        if (!db) return [];
        
        
        return db.query('SELECT * FROM event_log WHERE block_id > ? ORDER BY block_id ASC LIMIT 100', [remoteBlockIdCursor]);
    }
}

module.exports = new MerkleSearchTree();
