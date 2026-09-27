'use strict';

const MatterAuditEngine = require('../../observability/MatterAuditEngine');

const RATE_RECORD_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

class OllamaRbacGuard {
    constructor() {
        try {
            this.executionCounts = new Map();
            this.maxExecutionsPerMinute = 30;
            this._startCleanup();
        } catch (e) {
            this.executionCounts = new Map();
            this.maxExecutionsPerMinute = 30;
        }
    }

    _startCleanup() {
        try {
            const timer = setInterval(() => {
                try {
                    const now = Date.now();
                    for (const [userId, record] of this.executionCounts.entries()) {
                        if (now > record.resetAt + RATE_RECORD_TTL_MS) {
                            this.executionCounts.delete(userId);
                        }
                    }
                } catch (e) {}
            }, CLEANUP_INTERVAL_MS);
            if (timer.unref) timer.unref();
        } catch (e) {}
    }

    validateExecution(user, toolMetadata, toolName) {
        try {
            const userId = (user && user.id) || (user && user.userId) || 'anonymous';
            const userRole = (user && user.role) || 'guest';
            const userPermissions = Array.isArray(user && user.permissions) ? user.permissions : [];

            if (!user || userRole === 'guest') {
                this._logViolation(userId, userRole, toolName, 'GUEST_UNAUTHORIZED');
                return { allowed: false, error: 'Unauthenticated or guest users cannot trigger tool executions' };
            }

            if (!this._checkRateLimit(userId)) {
                this._logViolation(userId, userRole, toolName, 'RATE_LIMIT_EXCEEDED');
                return { allowed: false, error: 'User tool execution rate limit exceeded' };
            }

            if (userRole === 'admin' || userRole === 'system') {
                this._logSuccess(userId, userRole, toolName);
                return { allowed: true };
            }

            if (toolMetadata) {
                if (toolMetadata.requiredRole && toolMetadata.requiredRole === 'admin') {
                    this._logViolation(userId, userRole, toolName, 'ROLE_INSUFFICIENT');
                    return { allowed: false, error: `Tool requires admin privileges (User has: ${userRole})` };
                }

                if (toolMetadata.requiredPermission) {
                    const hasPerm = userPermissions.includes('*') || userPermissions.includes(toolMetadata.requiredPermission);
                    if (!hasPerm) {
                        this._logViolation(userId, userRole, toolName, 'PERMISSION_DENIED');
                        return { allowed: false, error: `User lacks required permission: ${toolMetadata.requiredPermission}` };
                    }
                }
            }

            this._logSuccess(userId, userRole, toolName);
            return { allowed: true };
        } catch (e) {
            return { allowed: false, error: e.message };
        }
    }

    _checkRateLimit(userId) {
        try {
            const now = Date.now();
            const record = this.executionCounts.get(userId) || { count: 0, resetAt: now + 60000 };

            if (now > record.resetAt) {
                record.count = 1;
                record.resetAt = now + 60000;
            } else {
                record.count += 1;
            }

            this.executionCounts.set(userId, record);
            return record.count <= this.maxExecutionsPerMinute;
        } catch (e) {
            return false;
        }
    }

    _logViolation(userId, userRole, toolName, reason) {
        try {
            MatterAuditEngine.record({
                category: 'ai_security',
                actor: { id: userId, role: userRole },
                action: 'AI_TOOL_EXECUTION_BLOCKED',
                target: toolName,
                data: { reason },
                status: 'BLOCKED'
            });
        } catch (e) {
            return false;
        }
    }

    _logSuccess(userId, userRole, toolName) {
        try {
            MatterAuditEngine.record({
                category: 'ai_security',
                actor: { id: userId, role: userRole },
                action: 'AI_TOOL_EXECUTION_ALLOWED',
                target: toolName,
                data: { status: 'AUTHORIZED' },
                status: 'SUCCESS'
            });
        } catch (e) {
            return false;
        }
    }

    reset() {
        try {
            this.executionCounts.clear();
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new OllamaRbacGuard();
