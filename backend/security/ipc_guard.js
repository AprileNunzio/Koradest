'use strict';
const policy = require('./ipc_policy');

const WILDCARD = '*';
const DENIED_UNCLASSIFIED = 'IPC_CHANNEL_UNCLASSIFIED';
const DENIED_NO_SESSION = 'IPC_SESSION_REQUIRED';
const DENIED_NO_PERMISSION = 'IPC_PERMISSION_DENIED';

const MESSAGES = {
    [DENIED_UNCLASSIFIED]: 'Operazione non disponibile: canale non dichiarato nella politica di accesso.',
    [DENIED_NO_SESSION]: 'Operazione riservata agli utenti autenticati.',
    [DENIED_NO_PERMISSION]: 'Non hai i permessi necessari per questa operazione.'
};

function _currentUserId() {
    try {
        return require('../core/session_manager').getCurrentUserId();
    } catch (_) {
        return null;
    }
}

function _effectivePermissions(userId) {
    try {
        const result = require('../handlers/rbac').getEffectiveUserPermissions(null, userId);
        return Array.isArray(result) ? result : [];
    } catch (e) {
        console.error('[IpcGuard] Lettura permessi non riuscita:', e.message);
        return [];
    }
}

function _audit(channel, userId, reason) {
    console.warn(`[IpcGuard] Accesso negato a "${channel}" (utente: ${userId || 'nessuno'}, motivo: ${reason})`);
    try {
        require('../observability/auditLogger').logEvent(userId || 'anonimo', 'IPC_DENIED', 'ipc_channel', channel, { reason }, 'DENIED');
    } catch (_) {}
}

function authorize(channel) {
    const rule = policy.resolve(channel);
    if (!rule) return { allowed: false, reason: DENIED_UNCLASSIFIED, userId: null };
    if (rule.level === 'public') return { allowed: true };
    const userId = _currentUserId();
    if (!userId) return { allowed: false, reason: DENIED_NO_SESSION, userId: null };
    if (rule.level === 'session') return { allowed: true };
    const permissions = _effectivePermissions(userId);
    if (permissions.includes(WILDCARD)) return { allowed: true };
    if (rule.level === 'superadmin') return { allowed: false, reason: DENIED_NO_PERMISSION, userId };
    const granted = rule.permissions.some(required => permissions.includes(required));
    if (granted) return { allowed: true };
    return { allowed: false, reason: DENIED_NO_PERMISSION, userId };
}

function denialPayload(reason) {
    return { success: false, error: MESSAGES[reason] || MESSAGES[DENIED_NO_PERMISSION], code: reason };
}

function createGuardedIpc(realIpcMain) {
    return {
        handle(channel, handler) {
            realIpcMain.removeHandler(channel);
            realIpcMain.handle(channel, async (event, ...args) => {
                const verdict = authorize(channel);
                if (!verdict.allowed) {
                    _audit(channel, verdict.userId, verdict.reason);
                    return denialPayload(verdict.reason);
                }
                return handler(event, ...args);
            });
        },
        removeHandler(channel) {
            realIpcMain.removeHandler(channel);
        },
        on(...args) {
            return realIpcMain.on(...args);
        }
    };
}

module.exports = {
    createGuardedIpc,
    authorize,
    denialPayload,
    DENIED_UNCLASSIFIED,
    DENIED_NO_SESSION,
    DENIED_NO_PERMISSION,
    MESSAGES
};
