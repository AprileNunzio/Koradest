'use strict';
const sessionManager = require('../core/session_manager');
const { getDB } = require('../db');

function _hasAccessLogsPermission() {
    try {
        const currentUserId = sessionManager.getCurrentUserId();
        if (!currentUserId) return false;
        const rbacHandlers = require('./rbac');
        const perms = rbacHandlers.getEffectiveUserPermissions(null, currentUserId) || [];
        return perms.includes('*') || perms.some(p => p.startsWith('impostazioni:'));
    } catch (e) {
        return false;
    }
}

async function getAllAccessLogs(event, filters = {}) {
    try {
        const { userId, eventType, success, dateFrom, dateTo, ip, page = 1, pageSize = 50 } = filters;
        if (!_hasAccessLogsPermission()) return { success: false, error: 'Permesso negato' };
        const db = getDB();
        const where = ['1=1'];
        const params = [];
        if (userId) { where.push('a.user_id = ?'); params.push(userId); }
        if (eventType) { where.push('a.event_type = ?'); params.push(eventType); }
        if (success === true || success === false) { where.push('a.success = ?'); params.push(success ? 1 : 0); }
        if (dateFrom) { where.push('a.timestamp >= ?'); params.push(Number(dateFrom)); }
        if (dateTo) { where.push('a.timestamp <= ?'); params.push(Number(dateTo)); }
        if (ip) { where.push('a.ip_address LIKE ?'); params.push(`%${ip}%`); }
        const whereSql = where.join(' AND ');
        const totalRows = db.query(`SELECT COUNT(*) as cnt FROM access_logs a WHERE ${whereSql}`, params);
        const total = totalRows && totalRows.length > 0 ? totalRows[0].cnt : 0;
        const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 500);
        const offset = Math.max((Number(page) || 1) - 1, 0) * safePageSize;
        const logs = db.query(
            `SELECT a.*, u.username, u.nome, u.cognome FROM access_logs a 
            LEFT JOIN users u ON u.id = a.user_id 
            WHERE ${whereSql} 
            ORDER BY a.timestamp DESC LIMIT ? OFFSET ?`,
            [...params, safePageSize, offset]
        );
        return { success: true, logs, total, page: Number(page) || 1, pageSize: safePageSize };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function _localIp() {
    try {
        const os = require('os');
        let ipAddress = '127.0.0.1';
        const ifaces = os.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
            for (const iface of ifaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    ipAddress = iface.address;
                    break;
                }
            }
        }
        return ipAddress;
    } catch (e) {
        return '127.0.0.1';
    }
}

function notifySecurityEvent(userId, title, message) {
    try {
        const notificationsHandlers = require('./notifications');
        notificationsHandlers.create({ userId, category: 'security', title, message, severity: 'warning' }).catch(() => {});
    } catch (_) {}
}

const _PLATFORM_LABELS = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };

function _deviceLabel() {
    try {
        const os = require('os');
        const platform = _PLATFORM_LABELS[os.platform()] || os.platform();
        return `${platform} ${os.release()} (${os.arch()})`;
    } catch (_) {
        return 'Sconosciuto';
    }
}

function writeAccessLog({ userId, eventType, success, authMethod }) {
    try {
        const crypto = require('crypto');
        const db = getDB();
        const { wrapMutationWithEvent } = require('../db');
        const nodeIdentity = require('../core/node_identity');
        const nodeId = nodeIdentity.getNodeId();
        const nodeName = nodeIdentity.getNetworkName();
        const logId = crypto.randomUUID();
        const now = Date.now();
        const deviceInfo = _deviceLabel();
        const logPayload = {
            id: logId, user_id: userId, node_id: nodeId, node_name: nodeName,
            ip_address: _localIp(), device_info: deviceInfo, timestamp: now, is_deleted: 0,
            event_type: eventType, success: success ? 1 : 0, auth_method: authMethod || '', last_modified: now
        };
        db.run(
            'INSERT INTO access_logs (id, user_id, node_id, node_name, ip_address, device_info, timestamp, is_deleted, event_type, success, auth_method, last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [logId, userId, nodeId, nodeName, logPayload.ip_address, deviceInfo, now, 0, eventType, success ? 1 : 0, authMethod || '', now]
        );
        wrapMutationWithEvent('INSERT', 'access_logs', logId, logPayload);
    } catch (_) {}
}

async function getAccessLogsStats(event) {
    try {
        if (!_hasAccessLogsPermission()) return { success: false, error: 'Permesso negato' };
        const db = getDB();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const last7d = db.query('SELECT COUNT(*) as cnt FROM access_logs WHERE timestamp >= ? AND event_type = ?', [sevenDaysAgo, 'login_success']);
        const failed7d = db.query('SELECT COUNT(*) as cnt FROM access_logs WHERE timestamp >= ? AND success = 0', [sevenDaysAgo]);
        const devices7d = db.query('SELECT COUNT(DISTINCT device_info) as cnt FROM access_logs WHERE timestamp >= ?', [sevenDaysAgo]);
        return {
            success: true,
            logins7d: last7d[0] ? last7d[0].cnt : 0,
            failed7d: failed7d[0] ? failed7d[0].cnt : 0,
            distinctDevices7d: devices7d[0] ? devices7d[0].cnt : 0
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { getAllAccessLogs, getAccessLogsStats, writeAccessLog, notifySecurityEvent };
