'use strict';

class ZeroTrustPolicyEngine {
    constructor() {
        try {
            this.policies = new Map();
        } catch (e) {
            this.policies = new Map();
        }
    }

    registerPolicy(resourcePattern, policyFn) {
        try {
            if (!resourcePattern || typeof policyFn !== 'function') {
                return false;
            }
            this.policies.set(resourcePattern, policyFn);
            return true;
        } catch (e) {
            return false;
        }
    }

    _matchPattern(pattern, resource) {
        try {
            if (pattern === '*' || pattern === resource) return true;
            if (pattern.endsWith(':*')) {
                const prefix = pattern.slice(0, -2);
                return resource.startsWith(prefix);
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async evaluate(context) {
        try {
            if (!context || typeof context !== 'object') {
                return { allowed: false, reason: 'Contesto di sicurezza nullo o non valido' };
            }

            const { subject, action, resource, environment } = context;

            if (!subject || !subject.id) {
                return { allowed: false, reason: 'Identita del soggetto non dichiarata' };
            }

            if (!action || !resource) {
                return { allowed: false, reason: 'Azione o risorsa mancante nella richiesta' };
            }

            if (subject.tokenExpiresAt && Date.now() > subject.tokenExpiresAt) {
                return { allowed: false, reason: 'Token di sessione scaduto' };
            }

            const userRoles = Array.isArray(subject.roles) ? subject.roles : [];
            if (userRoles.includes('admin') || userRoles.includes('*')) {
                return { allowed: true, evaluatedBy: 'admin_override' };
            }

            for (const [pattern, policyFn] of this.policies.entries()) {
                if (this._matchPattern(pattern, resource)) {
                    const result = await policyFn(subject, action, resource, environment || {});
                    if (result && result.allowed) {
                        return { allowed: true, evaluatedBy: pattern };
                    }
                    if (result && result.allowed === false) {
                        return { allowed: false, reason: result.reason || 'Negato da policy esplicita' };
                    }
                }
            }

            const requiredPermission = `${resource}:${action}`;
            const permissions = Array.isArray(subject.permissions) ? subject.permissions : [];

            const hasExplicitPerm = permissions.some((perm) => {
                if (perm === '*' || perm === requiredPermission) return true;
                if (perm.endsWith(':*')) {
                    const prefix = perm.slice(0, -2);
                    return requiredPermission.startsWith(prefix) || resource.startsWith(prefix);
                }
                return false;
            });

            if (hasExplicitPerm) {
                return { allowed: true, evaluatedBy: 'permission_match' };
            }

            return {
                allowed: false,
                reason: `Permesso mancante: ${requiredPermission} per il soggetto ${subject.id}`
            };
        } catch (e) {
            return { allowed: false, reason: e.message };
        }
    }
}

module.exports = new ZeroTrustPolicyEngine();
