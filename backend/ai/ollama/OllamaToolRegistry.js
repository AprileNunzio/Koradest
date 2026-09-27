'use strict';

const UniversalEventBus = require('../../core/bus/UniversalEventBus');

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function containsDangerousKeys(obj, depth = 0) {
    if (depth > 12 || !obj || typeof obj !== 'object') return { ok: true };
    for (const key of Object.keys(obj)) {
        if (DANGEROUS_KEYS.has(key)) return { ok: false, key };
        const val = obj[key];
        if (val && typeof val === 'object') {
            const nested = containsDangerousKeys(val, depth + 1);
            if (!nested.ok) return nested;
        }
    }
    return { ok: true };
}

function normalizeArgs(rawArgs) {
    if (rawArgs === undefined || rawArgs === null) return {};
    if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) return rawArgs;
    if (typeof rawArgs === 'string') {
        const trimmed = rawArgs.trim();
        if (!trimmed) return {};
        try {
            const parsed = JSON.parse(trimmed);
            return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

const TYPE_CHECKERS = {
    string: v => typeof v === 'string',
    number: v => typeof v === 'number' && !Number.isNaN(v),
    integer: v => Number.isInteger(v),
    boolean: v => typeof v === 'boolean',
    object: v => v !== null && typeof v === 'object' && !Array.isArray(v),
    array: v => Array.isArray(v)
};

function validateAgainstSchema(value, schema, path = 'root') {
    try {
        if (!schema || typeof schema !== 'object') return { valid: true };

        if (schema.type === 'object') {
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                return { valid: false, error: `Il parametro "${path}" deve essere un oggetto` };
            }
            const required = Array.isArray(schema.required) ? schema.required : [];
            for (const req of required) {
                if (!(req in value)) {
                    return { valid: false, error: `Parametro obbligatorio mancante: "${req}"` };
                }
            }
            const props = schema.properties || {};
            for (const [key, propSchema] of Object.entries(props)) {
                if (key in value) {
                    const childResult = validateAgainstSchema(value[key], propSchema, `${path}.${key}`);
                    if (!childResult.valid) return childResult;
                }
            }
            return { valid: true };
        }

        if (schema.type && TYPE_CHECKERS[schema.type] && !TYPE_CHECKERS[schema.type](value)) {
            return { valid: false, error: `Il campo "${path}" deve essere di tipo ${schema.type}` };
        }

        if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
            return { valid: false, error: `Il valore di "${path}" deve essere uno tra: ${schema.enum.join(', ')}` };
        }

        if (schema.type === 'array' && schema.items && Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const itemResult = validateAgainstSchema(value[i], schema.items, `${path}[${i}]`);
                if (!itemResult.valid) return itemResult;
            }
        }

        return { valid: true };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

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
                if (role === 'admin' || role === 'system') {
                    result.push({ type: tool.type, function: tool.function });
                    continue;
                }

                if (meta.requiredRole && meta.requiredRole === 'admin' && role !== 'admin') {
                    continue;
                }

                if (meta.requiredPermission && !userPermissions.includes(meta.requiredPermission) && !userPermissions.includes('*')) {
                    continue;
                }

                result.push({ type: tool.type, function: tool.function });
            }

            return result;
        } catch (e) {
            return [];
        }
    }

    validateArguments(toolKey, rawArgs) {
        try {
            const tool = this.tools.get(toolKey);
            if (!tool) return { valid: false, error: `Tool sconosciuto: ${toolKey}` };

            const args = normalizeArgs(rawArgs);
            if (args === null) {
                return { valid: false, error: 'Argomenti non validi: JSON malformato' };
            }

            const dangerousKeyCheck = containsDangerousKeys(args);
            if (!dangerousKeyCheck.ok) {
                return { valid: false, error: `Chiave non consentita rilevata negli argomenti: "${dangerousKeyCheck.key}"` };
            }

            const schema = (tool.function && tool.function.parameters) || { type: 'object', properties: {}, required: [] };
            const schemaCheck = validateAgainstSchema(args, schema);
            if (!schemaCheck.valid) return schemaCheck;

            return { valid: true, args };
        } catch (e) {
            return { valid: false, error: e.message };
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
