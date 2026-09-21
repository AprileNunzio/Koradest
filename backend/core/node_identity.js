'use strict';
const crypto = require('crypto');
const os = require('os');
let _nodeId = null;
function getNodeId() {
    if (_nodeId) return _nodeId;
    try {
        const db = require('../db').getDB('config');
        const res = db.query("SELECT key_value FROM network_config WHERE key_name = 'node_id'");
        if (res && res.length > 0) { _nodeId = res[0].key_value; return _nodeId; }
        const newId = _generate();
        db.run("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)", ['node_id', newId]);
        require('../db').saveDB('config');
        _nodeId = newId;
        return _nodeId;
    } catch (_) {
        _nodeId = _generate();
        return _nodeId;
    }
}
function getPcName() {
    try {
        return os.hostname() || 'Unknown-PC';
    } catch (_) {
        return 'Unknown-PC';
    }
}
function getNetworkName() {
    try {
        const networkSession = require('../networks/session/network_session');
        if (networkSession && networkSession.isActive()) {
            const desc = networkSession.descriptor();
            if (desc && desc.name) return desc.name;
        }
    } catch (_) {}
    try {
        const db = require('../db').getDB('config');
        if (db) {
            const res = db.query("SELECT key_value FROM network_config WHERE key_name = 'network_name'");
            if (res && res.length > 0 && res[0].key_value) return res[0].key_value;
        }
    } catch (_) {}
    return '';
}
function getNodeDisplayName() {
    try {
        const pc = getPcName();
        const net = getNetworkName();
        return net ? `${net} (${pc})` : pc;
    } catch (_) {
        return getPcName();
    }
}
function _generate() {
    try { return require('uuid').v4(); } catch (_) { return crypto.randomBytes(16).toString('hex'); }
}
module.exports = { getNodeId, getPcName, getNetworkName, getNodeDisplayName };
