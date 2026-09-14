'use strict';
const { getDB, saveDB, wrapMutationWithEvent } = require('../../db');

const POLICY_ID = 'default';
const ENFORCEMENTS = ['off', 'soft', 'hard'];
const MIN_NODES_MAX = 64;
const GRACE_MIN_MS = 0;
const GRACE_MAX_MS = 3600000;
const DEFAULT_POLICY = { id: POLICY_ID, minNodes: 1, enforcement: 'soft', graceMs: 120000, updatedBy: '', lastModified: 0 };

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _toDomain(row) {
    if (!row) return { ...DEFAULT_POLICY };
    return {
        id: row.id,
        minNodes: Number(row.min_nodes) || 1,
        enforcement: ENFORCEMENTS.includes(row.enforcement) ? row.enforcement : 'soft',
        graceMs: Number(row.grace_ms) || 0,
        updatedBy: row.updated_by || '',
        lastModified: Number(row.last_modified) || 0
    };
}

function getPolicy() {
    try {
        const rows = getDB('auth').query('SELECT * FROM network_policy WHERE id = ? AND is_deleted = 0', [POLICY_ID]);
        return _toDomain(rows && rows.length > 0 ? rows[0] : null);
    } catch (e) {
        if (e.message === 'DB_NOT_INITIALIZED') return { ...DEFAULT_POLICY };
        throw e;
    }
}

function _validate({ minNodes, enforcement, graceMs }) {
    const nodes = Number(minNodes);
    if (!Number.isInteger(nodes) || nodes < 1 || nodes > MIN_NODES_MAX) throw _expected('QUORUM_MIN_NODES_INVALID');
    if (!ENFORCEMENTS.includes(enforcement)) throw _expected('QUORUM_ENFORCEMENT_INVALID');
    const grace = Number(graceMs);
    if (!Number.isInteger(grace) || grace < GRACE_MIN_MS || grace > GRACE_MAX_MS) throw _expected('QUORUM_GRACE_INVALID');
    return { minNodes: nodes, enforcement, graceMs: grace };
}

async function setPolicy(input, actorUserId) {
    const { isSuperadmin } = require('../../core/access_guard');
    if (!isSuperadmin()) throw _expected('FORBIDDEN');
    const clean = _validate(input);
    const now = Date.now();
    const db = getDB('auth');
    db.run(
        'INSERT INTO network_policy (id, min_nodes, enforcement, grace_ms, updated_by, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 0) ' +
        'ON CONFLICT(id) DO UPDATE SET min_nodes = excluded.min_nodes, enforcement = excluded.enforcement, grace_ms = excluded.grace_ms, updated_by = excluded.updated_by, last_modified = excluded.last_modified, is_deleted = 0',
        [POLICY_ID, clean.minNodes, clean.enforcement, clean.graceMs, actorUserId || '', now]
    );
    await saveDB('auth', true);
    wrapMutationWithEvent('UPDATE', 'network_policy', POLICY_ID, {
        id: POLICY_ID,
        min_nodes: clean.minNodes,
        enforcement: clean.enforcement,
        grace_ms: clean.graceMs,
        updated_by: actorUserId || '',
        last_modified: now,
        is_deleted: 0
    });
    return getPolicy();
}

module.exports = { POLICY_ID, ENFORCEMENTS, MIN_NODES_MAX, DEFAULT_POLICY, getPolicy, setPolicy };
