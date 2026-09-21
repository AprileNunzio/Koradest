'use strict';
const registry = require('../registry/network_registry');
const identity = require('../registry/network_identity');
const networkSession = require('../session/network_session');
const provisioner = require('./workspace_provisioner');
const teardown = require('./runtime_teardown');
const bootstrap = require('./runtime_bootstrap');

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _resolveCode(entry, rawCode) {
    const provided = rawCode ? identity.normalizeCode(rawCode) : null;
    if (provided) {
        if (!registry.verifyCode(entry, provided)) throw _expected('NETWORK_CODE_MISMATCH');
        return provided;
    }
    const stored = registry.resolveStoredCode(entry);
    if (!stored) throw _expected('NETWORK_CODE_REQUIRED');
    return stored;
}

async function deactivate() {
    if (!networkSession.isActive()) return false;
    await teardown.teardownRuntime();
    return true;
}

async function _enter(entry, code, opener) {
    if (networkSession.isActive()) await teardown.teardownRuntime();
    try {
        await opener();
        networkSession.activate(entry, code);
    } catch (e) {
        await teardown.teardownRuntime();
        throw e;
    }
    registry.touch(entry.id);
    await bootstrap.bootstrapRuntime();
    teardown.notifyRenderer('network:activated', networkSession.descriptor());
    return networkSession.descriptor();
}

async function activate(networkId, rawCode, { remember = null } = {}) {
    const entry = registry.getById(networkId);
    if (!entry) throw _expected('NETWORK_NOT_FOUND');
    const code = _resolveCode(entry, rawCode);
    if (networkSession.getActiveId() === entry.id) return networkSession.descriptor();
    const descriptor = await _enter(entry, code, () => provisioner.openExisting(entry, code));
    if (remember !== null) registry.setRememberCode(entry.id, code, remember === true);
    return descriptor;
}

async function createNetwork({ name, remember = false, minNodes = 1 }) {
    const cleanName = identity.sanitizeName(name);
    if (!cleanName) throw _expected('NETWORK_NAME_INVALID');
    const code = provisioner.generateNetworkCode();
    const entry = registry.create({ name: cleanName, code, role: 'owner', remember: remember === true });
    registry.update(entry.id, () => ({ pendingMinNodes: Number(minNodes) || 1 }));
    const fresh = registry.getById(entry.id);
    try {
        await _enter(fresh, code, () => provisioner.provisionEmpty(fresh, code, cleanName));
    } catch (e) {
        try { registry.remove(entry.id, { rawCode: code, purgeData: true }); } catch (_) {}
        throw e;
    }
    return { network: networkSession.descriptor(), networkCode: code };
}

function _nomeDalCreatore() {
    try {
        const rows = require('../../db').getDB('config').query("SELECT key_value FROM network_config WHERE key_name = 'network_name'");
        if (!rows || rows.length === 0) return '';
        return identity.sanitizeName(rows[0].key_value);
    } catch (_) {
        return '';
    }
}

async function joinNetwork({ name, code, host, port, remember = false }) {
    const cleanName = identity.sanitizeName(name);
    const normalized = identity.normalizeCode(code);
    if (!normalized) throw identity.invalidCodeError();
    const known = registry.findByPublicId(identity.publicIdOf(normalized));
    const entry = known || registry.create({ name: cleanName || 'Rete in sincronizzazione', code: normalized, role: 'member', remember: remember === true });
    if (networkSession.isActive()) await teardown.teardownRuntime();
    provisioner.bindWorkspace(entry, normalized);
    const { cloneFromRemoteNode } = require('../../sync/network_cloner');
    const result = await cloneFromRemoteNode({ host, port, networkCode: normalized, networkName: null });
    if (!result || !result.success) {
        if (!known) {
            try { registry.remove(entry.id, { rawCode: normalized, purgeData: true }); } catch (_) {}
        }
        await teardown.teardownRuntime();
        return { success: false, error: (result && result.error) || 'Sincronizzazione non riuscita' };
    }
    let definitivo = entry;
    const nomeCreatore = _nomeDalCreatore() || (result && result.networkName);
    if (nomeCreatore && nomeCreatore !== entry.name) {
        definitivo = registry.rename(entry.id, nomeCreatore);
    }
    networkSession.activate(definitivo, normalized);
    registry.touch(definitivo.id);
    if (remember === true) registry.setRememberCode(definitivo.id, normalized, true);
    await bootstrap.bootstrapRuntime();
    teardown.notifyRenderer('network:activated', networkSession.descriptor());
    return { success: true, network: networkSession.descriptor(), userCount: result.userCount, appCount: result.appCount };
}

async function removeNetwork(networkId, rawCode, purgeData) {
    const entry = registry.getById(networkId);
    if (!entry) throw _expected('NETWORK_NOT_FOUND');
    if (networkSession.getActiveId() === networkId) await teardown.teardownRuntime();
    return registry.remove(networkId, { rawCode, purgeData: purgeData === true });
}

module.exports = { activate, deactivate, createNetwork, joinNetwork, removeNetwork };
