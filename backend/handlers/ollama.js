'use strict';

const { bridge, toolRegistry, rbacGuard, dataProtector, OllamaClient } = require('../ai/ollama');
const configHandlers = require('../config');
const sessionManager = require('../core/session_manager');
const rbac = require('./rbac');
const auditLogger = require('../observability/auditLogger');
const { gateway } = require('../ai/gateway');

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
        const consentiti = Object.fromEntries(Object.entries(dati).filter(([chiave]) => Object.prototype.hasOwnProperty.call(DEFAULT_CONFIG, chiave)));
        if (consentiti.host !== undefined && !/^https?:\/\/[A-Za-z0-9.\-[\]:]+(:\d{1,5})?\/?$/.test(String(consentiti.host))) {
            return { success: false, error: 'L\'indirizzo del server Ollama non è valido' };
        }
        if (consentiti.systemPrompt !== undefined) consentiti.systemPrompt = String(consentiti.systemPrompt).slice(0, 4000);
        if (consentiti.voiceRate !== undefined) consentiti.voiceRate = Math.min(1.4, Math.max(0.7, Number(consentiti.voiceRate) || 1));
        if (consentiti.voiceEnabled !== undefined) consentiti.voiceEnabled = consentiti.voiceEnabled === true;
        const aggiornata = configHandlers.aggiornaSezione('ollama', attuale => ({
            ...DEFAULT_CONFIG,
            ...(attuale && typeof attuale === 'object' ? attuale : {}),
            ...consentiti
        }));
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

function contestoPagina(payload) {
    if (!payload.pageContext && !payload.activeRoute) return '';
    const grezzo = `Pagina/Modulo attuale: ${String(payload.activeRoute || 'Dashboard').slice(0, 200)}
Contenuto visibile a schermo:
${String(payload.pageContext || 'Nessun dettaglio aggiuntivo').slice(0, 6000)}`;
    const controllo = dataProtector.sanitizeInputPrompt(grezzo);
    return controllo.safe ? `
[CONTESTO OPERATIVO UTENTE]
${controllo.text}
[FINE CONTESTO]` : '';
}

async function chat(event, payload = {}) {
    try {
        const conf = ottieniConfigurazione();
        applicaARuntime(conf);
        const utente = await ottieniUtenteAttuale();
        return await gateway().chiedi({
            utente,
            prompt: payload.prompt,
            appAttiva: /^[a-z][a-z0-9_]{1,39}$/.test(String(payload.appAttiva || '')) ? payload.appAttiva : null,
            sistema: `${conf.systemPrompt || ''}${gateway().descrivi().inviaContestoPagina ? contestoPagina(payload || {}) : ''}`
        });
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
