'use strict';

const { bridge, toolRegistry, rbacGuard, dataProtector, OllamaClient } = require('../ai/ollama');
const configHandlers = require('../config');
const sessionManager = require('../core/session_manager');
const rbac = require('./rbac');
const auditLogger = require('../observability/auditLogger');

const DEFAULT_CONFIG = {
    host: 'http://127.0.0.1:11434',
    defaultModel: 'llama3',
    temperature: 0.7,
    timeoutMs: 60000,
    keepAlive: '5m',
    systemPrompt: 'Sei Jarvis, assistente operativo AI integrato in KORADEST. Rispondi in italiano in modo chiaro, conciso e operativo. Se ti viene chiesto di eseguire azioni o consultare dati, usa gli strumenti di sistema appropriati.',
    voiceEnabled: false,
    voiceRate: 1.0,
    voicePitch: 1.0,
    allowRemoteNodeAccess: true,
    jarvisFloatingEnabled: true
};

function ottieniConfigurazione() {
    try {
        const raw = configHandlers.readConfig();
        if (raw && raw.ollama && typeof raw.ollama === 'object') {
            return Object.assign({}, DEFAULT_CONFIG, raw.ollama);
        }
        return { ...DEFAULT_CONFIG };
    } catch (e) {
        return { ...DEFAULT_CONFIG };
    }
}

function applicaARuntime(conf) {
    try {
        if (conf && conf.host) {
            bridge.setServer(conf.host, conf.defaultModel || null);
        }
    } catch (err) { console.warn('[Ollama]', err && err.message ? err.message : err); }
}

async function ottieniUtenteAttuale() {
    try {
        const userId = sessionManager.getCurrentUserId();
        if (!userId) {
            return { id: 'anonymous', role: 'guest', permissions: [] };
        }
        const perms = rbac.getEffectiveUserPermissions(null, userId);
        const isSuperadmin = Array.isArray(perms) && perms.includes('*');
        return {
            id: userId,
            role: isSuperadmin ? 'admin' : 'user',
            permissions: Array.isArray(perms) ? perms : []
        };
    } catch (e) {
        return { id: 'anonymous', role: 'guest', permissions: [] };
    }
}

async function getStatus() {
    try {
        const conf = ottieniConfigurazione();
        applicaARuntime(conf);
        const t0 = Date.now();
        const health = await bridge.client.checkHealth();
        const latencyMs = Date.now() - t0;
        return {
            success: true,
            available: health.available === true,
            host: conf.host,
            models: Array.isArray(health.models) ? health.models : [],
            defaultModel: conf.defaultModel,
            latencyMs: health.available ? latencyMs : -1,
            error: health.error || null
        };
    } catch (e) {
        return {
            success: false,
            available: false,
            host: 'http://127.0.0.1:11434',
            models: [],
            latencyMs: -1,
            error: e.message
        };
    }
}

async function getConfig() {
    try {
        return { success: true, data: ottieniConfigurazione() };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function saveConfig(event, dati) {
    try {
        if (!dati || typeof dati !== 'object') {
            return { success: false, error: 'Dati di configurazione non validi' };
        }
        let raw = configHandlers.readConfig();
        if (!raw || typeof raw !== 'object') {
            raw = {};
        }
        const current = raw.ollama && typeof raw.ollama === 'object' ? raw.ollama : DEFAULT_CONFIG;
        const aggiornata = Object.assign({}, current, dati);
        raw.ollama = aggiornata;
        configHandlers.saveConfig(raw);
        applicaARuntime(aggiornata);
        auditLogger.logEvent('ollama', 'CONFIG_UPDATED', 'ollama_config', aggiornata.host, { defaultModel: aggiornata.defaultModel }, 'SUCCESS');
        return { success: true, data: aggiornata };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function testConnection(event, dati = {}) {
    try {
        const host = (dati && dati.host) || ottieniConfigurazione().host || 'http://127.0.0.1:11434';
        const client = new OllamaClient(host);
        const t0 = Date.now();
        const health = await client.checkHealth();
        const latencyMs = Date.now() - t0;
        return {
            success: health.available === true,
            available: health.available === true,
            host,
            models: health.models || [],
            latencyMs: health.available ? latencyMs : -1,
            error: health.error || null
        };
    } catch (e) {
        return { success: false, available: false, latencyMs: -1, error: e.message };
    }
}

async function listModels(event, dati = {}) {
    try {
        const host = (dati && dati.host) || ottieniConfigurazione().host;
        const client = new OllamaClient(host);
        const health = await client.checkHealth();
        return {
            success: health.available === true,
            models: health.models || [],
            error: health.error || null
        };
    } catch (e) {
        return { success: false, models: [], error: e.message };
    }
}

async function chat(event, payload = {}) {
    try {
        const prompt = String(payload.prompt || '').trim();
        if (!prompt) {
            return { success: false, error: 'Prompt vuoto' };
        }
        const conf = ottieniConfigurazione();
        applicaARuntime(conf);
        const user = await ottieniUtenteAttuale();

        let systemPrompt = payload.systemPrompt || conf.systemPrompt || '';
        if (payload.pageContext || payload.activeRoute) {
            systemPrompt += `\n[CONTESTO OPERATIVO UTENTE]\nPagina/Modulo attuale: ${payload.activeRoute || 'Dashboard'}\nContenuto visibile a schermo:\n${payload.pageContext || 'Nessun dettaglio aggiuntivo'}\n[FINE CONTESTO]`;
        }

        const res = await bridge.ask({
            user,
            prompt,
            model: payload.model || conf.defaultModel,
            systemPrompt
        });

        if (res && res.success) {
            auditLogger.logEvent(user.id, 'AI_ASSISTANT_QUERY', 'jarvis', 'chat', { toolCallsExecuted: res.toolCallsExecuted || 0 }, 'SUCCESS');
        }

        return res;
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getRegisteredTools() {
    try {
        const user = await ottieniUtenteAttuale();
        const tools = toolRegistry.getToolsForUser(user);
        return { success: true, count: tools.length, tools };
    } catch (e) {
        return { success: false, count: 0, tools: [], error: e.message };
    }
}

module.exports = {
    getStatus,
    getConfig,
    saveConfig,
    testConnection,
    listModels,
    chat,
    getRegisteredTools
};
