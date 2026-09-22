'use strict';

const { SqliteRepository } = require('../db/DAL');
const { universalEventBus } = require('../core/bus');
const { antiCorruptionGateway } = require('../db/ACL');

function defineApp(declaration) {
    try {
        if (!declaration || !declaration.id) {
            throw new Error('La dichiarazione dell app richiede almeno un id univoco');
        }

        const appDefinition = {
            id: declaration.id,
            name: declaration.name || declaration.id,
            version: declaration.version || '1.0.0',
            actions: new Map(),
            eventSubscriptions: new Map(),
            repositories: new Set(declaration.repositories || [])
        };

        if (declaration.actions && typeof declaration.actions === 'object') {
            for (const [actionName, handler] of Object.entries(declaration.actions)) {
                if (typeof handler === 'function') {
                    appDefinition.actions.set(actionName, handler);
                }
            }
        }

        function createAppContext(runtimeEnvironment = {}) {
            try {
                const dbAdapter = runtimeEnvironment.dbAdapter || null;
                const user = runtimeEnvironment.user || null;

                return {
                    appId: appDefinition.id,
                    user,
                    repo: (tableName) => {
                        try {
                            if (!dbAdapter) throw new Error('Database adapter non disponibile nel contesto');
                            return new SqliteRepository(tableName, dbAdapter);
                        } catch (e) {
                            throw e;
                        }
                    },
                    bus: universalEventBus,
                    acl: antiCorruptionGateway,
                    log: {
                        info: (msg, meta) => { try { console.log(`[${appDefinition.id}] ${msg}`, meta || ''); } catch (_) { return false; } },
                        error: (msg, meta) => { try { console.error(`[${appDefinition.id}] ${msg}`, meta || ''); } catch (_) { return false; } }
                    }
                };
            } catch (e) {
                return {};
            }
        }

        async function invokeAction(actionName, payload, runtimeEnvironment = {}) {
            try {
                const handler = appDefinition.actions.get(actionName);
                if (!handler) {
                    return { success: false, error: `Azione non trovata: ${actionName} in app ${appDefinition.id}` };
                }

                const ctx = createAppContext(runtimeEnvironment);
                const data = await handler(payload, ctx);
                return { success: true, data };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        function mountBusEvents() {
            try {
                if (declaration.events && typeof declaration.events === 'object') {
                    for (const [topic, handler] of Object.entries(declaration.events)) {
                        if (typeof handler === 'function') {
                            const unsub = universalEventBus.subscribe(topic, async (envelope) => {
                                try {
                                    const ctx = createAppContext();
                                    await handler(envelope, ctx);
                                } catch (e) {
                                    return;
                                }
                            });
                            appDefinition.eventSubscriptions.set(topic, unsub);
                        }
                    }
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        return {
            definition: appDefinition,
            invokeAction,
            mountBusEvents
        };
    } catch (e) {
        throw e;
    }
}

module.exports = { defineApp };
