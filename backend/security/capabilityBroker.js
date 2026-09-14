'use strict';

const crypto = require('crypto');
const appMetrics = require('../observability/appMetrics');
const auditLogger = require('../observability/auditLogger');

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

class CapabilityBroker {
    constructor() {
        try {
            this.appTokens = new Map();
            this.registeredHandlers = new Map();
            this._startGarbageCollector();
        } catch (error) {
            console.error('[CapabilityBroker] Inizializzazione non riuscita:', error.message);
        }
    }

    _startGarbageCollector() {
        try {
            setInterval(() => {
                try {
                    const now = Date.now();
                    this.appTokens.forEach((info, appId) => {
                        if (info.expiresAt && now > info.expiresAt) {
                            this.revokeAppToken(appId);
                        }
                    });
                } catch (e) {
                    console.error('[CapabilityBroker] Pulizia dei token non riuscita:', e.message);
                }
            }, 60 * 60 * 1000);
        } catch (e) {}
    }

    generateAppToken(appId, permissions) {
        try {
            const secret = crypto.randomBytes(32).toString('hex');
            const tokenInfo = {
                appId: appId,
                secret: secret,
                permissions: new Set(permissions || []),
                createdAt: Date.now(),
                expiresAt: Date.now() + TOKEN_TTL_MS
            };
            this.appTokens.set(appId, tokenInfo);
            return secret;
        } catch (error) {
            return null;
        }
    }

    revokeAppToken(appId) {
        this.appTokens.delete(appId);
        this.registeredHandlers.delete(appId);
        return true;
    }

    static normalizeId(appId) {
        return String(appId || '').toLowerCase().replace(/[-_s]/g, '');
    }

    isInternalIdentity(appId) {
        const id = String(appId || '');
        return id === 'core' || id.startsWith('core:');
    }

    isKnownApp(appId) {
        if (this.appTokens.has(appId)) return true;
        const normalizzato = CapabilityBroker.normalizeId(appId);
        for (const registrato of this.appTokens.keys()) {
            if (CapabilityBroker.normalizeId(registrato) === normalizzato) return true;
        }
        return false;
    }

    authorizeCall(sourceAppId, targetAppId, action, origin) {
        if (this.isInternalIdentity(sourceAppId)) {
            if (origin === 'main') return { allowed: true };
            return { allowed: false, reason: 'L identita interna "core" non e utilizzabile dalle applicazioni.' };
        }
        if (!sourceAppId) return { allowed: false, reason: 'Applicazione chiamante non dichiarata.' };
        if (!this.isKnownApp(sourceAppId)) {
            return { allowed: false, reason: `Applicazione chiamante non riconosciuta: ${sourceAppId}` };
        }
        if (CapabilityBroker.normalizeId(sourceAppId) === CapabilityBroker.normalizeId(targetAppId)) {
            return { allowed: true };
        }
        const richiesto = `app:${targetAppId}:${action}`;
        if (this.verifyCapability(sourceAppId, richiesto)) return { allowed: true };
        return {
            allowed: false,
            reason: `L applicazione ${sourceAppId} non dichiara il permesso "${richiesto}" nel proprio manifest.`
        };
    }

    _matchScope(scope, requiredPermission) {
        if (scope === '*') return true;
        if (scope === requiredPermission) return true;
        if (!scope.endsWith(':*')) return false;
        return requiredPermission.startsWith(scope.slice(0, -1));
    }

    verifyCapability(appId, requiredPermission) {
        try {
            if (!this.appTokens.has(appId)) return false;
            const tokenInfo = this.appTokens.get(appId);
            if (!tokenInfo || !tokenInfo.permissions) return false;
            if (tokenInfo.expiresAt && Date.now() > tokenInfo.expiresAt) {
                this.revokeAppToken(appId);
                return false;
            }
            for (const scope of tokenInfo.permissions) {
                if (this._matchScope(String(scope), String(requiredPermission))) return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    registerApiHandler(appId, action, handlerFn) {
        try {
            const keys = [appId, appId.toLowerCase(), appId.replace(/[-_]/g, '')];
            for (const k of keys) {
                if (!this.registeredHandlers.has(k)) {
                    this.registeredHandlers.set(k, new Map());
                }
                const appMap = this.registeredHandlers.get(k);
                appMap.set(action, handlerFn);
                if (action.includes(':')) {
                    appMap.set(action.split(':')[1], handlerFn);
                }
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    async routeIpcCall(sourceAppId, targetAppId, action, payload, opzioni = {}) {
        const start = Date.now();
        const origin = opzioni.origin === 'main' ? 'main' : 'ipc';
        try {
            const verdetto = this.authorizeCall(sourceAppId, targetAppId, action, origin);
            if (!verdetto.allowed) {
                auditLogger.logEvent(sourceAppId || 'sconosciuto', 'APP_CALL_DENIED', 'app_action', `${targetAppId}:${action}`, { reason: verdetto.reason }, 'DENIED');
                throw new Error(verdetto.reason);
            }

            let manifestTrovato = false;
            let caricamentoRiuscito = false;

            if (!this.registeredHandlers.has(targetAppId)) {
                try {
                    const AppLoader = require('../core/AppLoader');
                    const appsRegistry = require('../core/appsRegistry');
                    const allApps = await appsRegistry.getAppsRegistry();
                    const manifest = allApps.find(m => 
                        m.id === targetAppId || 
                        m.folder === targetAppId ||
                        (m.id && m.id.toLowerCase() === targetAppId.toLowerCase()) ||
                        (m.folder && m.folder.toLowerCase() === targetAppId.toLowerCase())
                    );
                    if (manifest) {
                        manifestTrovato = true;
                        caricamentoRiuscito = await AppLoader.loadApp(manifest);
                    }
                } catch (_) {}
            }

            let targetMap = this.registeredHandlers.get(targetAppId);
            if (!targetMap) {
                const norm = targetAppId.toLowerCase().replace(/[-_]/g, '');
                for (const [k, v] of this.registeredHandlers.entries()) {
                    if (k.toLowerCase().replace(/[-_]/g, '') === norm) {
                        targetMap = v;
                        break;
                    }
                }
            }

            if (!targetMap) {
                if (manifestTrovato && !caricamentoRiuscito) {
                    throw new Error(`Avvio del backend fallito per ${targetAppId}: l'applicazione e installata ma non ha registrato le sue azioni`);
                }
                throw new Error(`Target non registrato: ${targetAppId}`);
            }

            let handler = targetMap.get(action);
            if (!handler) {
                const cleanAction = action.includes(':') ? action.split(':')[1] : action;
                for (const [k, h] of targetMap.entries()) {
                    if (k === cleanAction || (k.includes(':') && k.split(':')[1] === cleanAction)) {
                        handler = h;
                        break;
                    }
                }
            }

            if (typeof handler !== 'function') {
                throw new Error(`Azione non trovata su target ${targetAppId}: ${action}`);
            }

            const result = await Promise.resolve(handler(sourceAppId, payload));
            appMetrics.recordIpcInvocation(targetAppId, action, Date.now() - start, true);
            return result;
        } catch (error) {
            appMetrics.recordIpcInvocation(targetAppId, action, Date.now() - start, false, error.message);
            throw error;
        }
    }
}

module.exports = new CapabilityBroker();
