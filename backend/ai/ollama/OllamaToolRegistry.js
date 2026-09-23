'use strict';

const UniversalEventBus = require('../../core/bus/UniversalEventBus');
const { accessoConsentito } = require('../gateway/strumenti_runtime');

class OllamaToolRegistry {
    constructor() {
        try {
            this.tools = new Map();
            this.appActionsMap = new Map();
            this._setupBusListeners();
        } catch (e) {
            this.tools = new Map();
            this.appActionsMap = new Map();
        }
    }

    _setupBusListeners() {
        try {
            UniversalEventBus.subscribe('koradest.apps.*', async (envelope) => {
                try {
                    if (!envelope || !envelope.payload) return;
                    const { appId, manifest } = envelope.payload;
                    if (envelope.topic === 'koradest.apps.installed' || envelope.topic === 'koradest.apps.reloaded') {
                        if (manifest) {
                            this.registerAppManifest(manifest);
                        }
                    } else if (envelope.topic === 'koradest.apps.uninstalled') {
                        if (appId) {
                            this.unregisterApp(appId);
                        }
                    }
                } catch (eSub) {
                    return false;
                }
            });
        } catch (e) {
            return false;
        }
    }

    registerAppManifest(manifest) {
        try {
            if (!manifest || !manifest.id) return false;
            const appId = manifest.id;
            const actions = manifest.actions || (manifest.ipc && manifest.ipc.actions) || {};
            if (Object.keys(actions).length === 0) return false;
            const registeredCount = [];

            for (const [actionName, actionDef] of Object.entries(actions)) {
                const toolKey = `${appId}__${actionName}`;
                const toolDefinition = {
                    type: 'function',
                    function: {
                        name: toolKey,
                        description: (actionDef && actionDef.description) || `Execute ${actionName} on app ${appId}`,
                        parameters: (actionDef && actionDef.parameters) || {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    },
                    metadata: {
                        appId,
                        action: actionName,
                        requiredRole: (actionDef && actionDef.role) || (actionDef && actionDef.requiredRole) || 'user',
                        requiredPermission: (actionDef && actionDef.permission) || `${appId}.${actionName}`,
                        rateLimit: (actionDef && actionDef.rateLimit) || null
                    }
                };

                this.tools.set(toolKey, toolDefinition);
                registeredCount.push(toolKey);
            }

            this.appActionsMap.set(appId, registeredCount);
            UniversalEventBus.publish('koradest.ai.schema_update', { appId, registeredTools: registeredCount });
            return true;
        } catch (e) {
            return false;
        }
    }

    registerTools(appId, definizioni) {
        const chiavi = definizioni.map((definizione) => {
            this.tools.set(definizione.function.name, definizione);
            return definizione.function.name;
        });
        const precedenti = (this.appActionsMap.get(appId) || []).filter(chiave => !chiavi.includes(chiave));
        this.appActionsMap.set(appId, [...precedenti, ...chiavi]);
        UniversalEventBus.publish('koradest.ai.schema_update', { appId, registeredTools: chiavi });
        return chiavi.length;
    }

    unregisterApp(appId) {
        try {
            if (!appId || !this.appActionsMap.has(appId)) return false;
            const toolKeys = this.appActionsMap.get(appId) || [];
            for (const key of toolKeys) {
                this.tools.delete(key);
            }
            this.appActionsMap.delete(appId);
            UniversalEventBus.publish('koradest.ai.schema_update', { appId, removedTools: toolKeys });
            return true;
        } catch (e) {
            return false;
        }
    }

    getTool(toolKey) {
        try {
            return this.tools.get(toolKey) || null;
        } catch (e) {
            return null;
        }
    }

    getAllTools() {
        try {
            return Array.from(this.tools.values()).map(t => ({
                type: t.type,
                function: t.function
            }));
        } catch (e) {
            return [];
        }
    }

    getToolsForUser(user = {}) {
        try {
            const role = user.role || 'guest';
            const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
            const result = [];

            for (const [key, tool] of this.tools.entries()) {
                const meta = tool.metadata;
                if (meta.accesso) {
                    if (role === 'admin' || role === 'system' || accessoConsentito(user, meta.accesso)) result.push({ type: tool.type, function: tool.function });
                    continue;
                }
                if (role === 'admin' || role === 'system') {
                    result.push({ type: tool.type, function: tool.function });
                    continue;
                }

                if (meta.requiredRole && meta.requiredRole === 'admin' && role !== 'admin') {
                    continue;
                }

                if (meta.requiredPermission && userPermissions.length > 0 && !userPermissions.includes(meta.requiredPermission) && !userPermissions.includes('*')) {
                    continue;
                }

                result.push({ type: tool.type, function: tool.function });
            }

            return result;
        } catch (e) {
            return [];
        }
    }

    clear() {
        try {
            this.tools.clear();
            this.appActionsMap.clear();
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new OllamaToolRegistry();
