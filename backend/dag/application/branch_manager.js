'use strict';

const dbManager = require('../../db/db_manager');
const hlc = require('../application/hlc');
const crypto = require('crypto');

class BranchManager {
    constructor() {
        this.currentBranch = 'main';
    }

    checkout(branchName) {
        if (!branchName.match(/^[a-zA-Z0-9_-]+$/)) {
            throw new Error('Nome branch non valido');
        }
        this.currentBranch = branchName;
        return this.currentBranch;
    }

    getCurrentBranch() {
        return this.currentBranch;
    }

    createBranch(branchName, baseBranch = 'main') {
        const db = dbManager.getDB('ledger');
        
        const blockId = 'branch_' + crypto.randomUUID();
        const createdAt = hlc.now();
        db.run(
            'INSERT INTO event_log (block_id, parent_ids, event_type, table_name, record_id, payload, node_id, created_at, payload_version, is_applied, signature, received_at, validity, branch_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)',
            [blockId, '[]', 'BRANCH_CREATE', 'sys_branches', branchName, JSON.stringify({ baseBranch }), require('../../core/node_identity').getNodeId(), createdAt, 1, '', Date.now(), 'valid', 'main']
        );
        require('../../db').saveDB('ledger');
        return true;
    }

    getBranchFilterClause() {
        if (this.currentBranch === 'main') {
            return " (branch_name = 'main' OR branch_name IS NULL) ";
        } else {
            
            
            return ` (branch_name = 'main' OR branch_name IS NULL OR branch_name = '${this.currentBranch}') `;
        }
    }
}

module.exports = new BranchManager();
