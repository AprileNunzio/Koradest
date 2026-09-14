'use strict';
const fs = require('fs');
const registry = require('../registry/network_registry');
const identity = require('../registry/network_identity');
const networkSession = require('../session/network_session');
const activator = require('../lifecycle/network_activator');
const quorumPolicy = require('../quorum/quorum_policy');
const quorumEvaluator = require('../quorum/quorum_evaluator');
const { toResponse } = require('./network_errors');

function _isProvisioned(entry) {
    try {
        return fs.existsSync(registry.workspacePathOf(entry));
    } catch (_) {
        return false;
    }
}

function _toPublic(entry) {
    const activeId = networkSession.getActiveId();
    return {
        id: entry.id,
        name: entry.name,
        publicId: entry.publicId,
        role: entry.role,
        color: entry.color,
        createdAt: entry.createdAt,
        lastAccessAt: entry.lastAccessAt,
        hasStoredCode: Boolean(entry.sealedCode),
        autoStart: entry.autoStart === true,
        provisioned: _isProvisioned(entry),
        isActive: entry.id === activeId
    };
}

async function _guarded(fn) {
    try {
        return await fn();
    } catch (e) {
        return toResponse(e);
    }
}

function list() {
    return _guarded(async () => ({
        success: true,
        networks: registry.list().map(_toPublic),
        active: networkSession.descriptor()
    }));
}

function getActive() {
    return _guarded(async () => ({ success: true, active: networkSession.descriptor() }));
}

function create(event, data) {
    return _guarded(async () => {
        const result = await activator.createNetwork({
            name: data && data.name,
            remember: data && data.remember === true,
            minNodes: data && data.minNodes
        });
        return { success: true, ...result };
    });
}

function join(event, data) {
    return _guarded(async () => {
        const result = await activator.joinNetwork({
            name: data && data.name,
            code: data && data.code,
            host: data && data.host,
            port: data && data.port,
            remember: data && data.remember === true
        });
        return result;
    });
}

function activate(event, data) {
    return _guarded(async () => {
        const active = await activator.activate(
            data && data.networkId,
            data && data.code,
            { remember: data && typeof data.remember === 'boolean' ? data.remember : null }
        );
        return { success: true, active };
    });
}

function deactivate() {
    return _guarded(async () => {
        await activator.deactivate();
        return { success: true };
    });
}

function rename(event, data) {
    return _guarded(async () => {
        const entry = registry.rename(data && data.networkId, data && data.name);
        return { success: true, network: _toPublic(entry) };
    });
}

function remove(event, data) {
    return _guarded(async () => {
        await activator.removeNetwork(data && data.networkId, data && data.code, data && data.purgeData === true);
        return { success: true };
    });
}

function setAutoStart(event, data) {
    return _guarded(async () => {
        const entry = require('../lifecycle/network_autostart').setAutoStart(data && data.networkId, data && data.autoStart === true);
        return { success: true, network: _toPublic(entry) };
    });
}

function setRememberCode(event, data) {
    return _guarded(async () => {
        const entry = registry.setRememberCode(data && data.networkId, data && data.code, data && data.remember === true);
        return { success: true, network: _toPublic(entry) };
    });
}

function revealCode(event, data) {
    return _guarded(async () => {
        const { isSuperadmin } = require('../../core/access_guard');
        if (!networkSession.isActive()) {
            const err = new Error('NETWORK_NOT_ACTIVE');
            err.isExpected = true;
            throw err;
        }
        if (!isSuperadmin()) {
            const err = new Error('FORBIDDEN');
            err.isExpected = true;
            throw err;
        }
        await require('../../security/step_up_auth').verifyCurrentUser(data && data.credential, 'networks:revealCode');
        return { success: true, code: networkSession.getActiveCode() };
    });
}

function createRecoveryKit(event, data) {
    return _guarded(async () => {
        const { isSuperadmin } = require('../../core/access_guard');
        if (!networkSession.isActive()) {
            const err = new Error('NETWORK_NOT_ACTIVE');
            err.isExpected = true;
            throw err;
        }
        if (!isSuperadmin()) {
            const err = new Error('FORBIDDEN');
            err.isExpected = true;
            throw err;
        }
        await require('../../security/step_up_auth').verifyCurrentUser(data && data.credential, 'networks:createRecoveryKit');
        const recoveryKit = require('../recovery/recovery_kit');
        const kit = recoveryKit.createKit(networkSession.getActiveCode(), {
            totalShares: Number(data && data.totalShares),
            threshold: Number(data && data.threshold)
        });
        const descrittore = networkSession.descriptor();
        return { success: true, kit: { ...kit, networkName: descrittore ? descrittore.name : '' } };
    });
}

function inspectRecoveryShares(event, data) {
    return _guarded(async () => {
        const recoveryKit = require('../recovery/recovery_kit');
        const esito = recoveryKit.inspectShares(Array.isArray(data && data.shares) ? data.shares : []);
        return {
            success: true,
            valide: esito.quote.length,
            errori: esito.errori,
            reteCoerente: esito.reteCoerente,
            riferimento: esito.riferimento
        };
    });
}

function restoreFromRecoveryKit(event, data) {
    return _guarded(async () => {
        const recoveryKit = require('../recovery/recovery_kit');
        const { code, publicId } = recoveryKit.restore(Array.isArray(data && data.shares) ? data.shares : []);
        const conosciuta = registry.findByPublicId(publicId);
        if (!conosciuta) {
            return { success: true, code, registered: false };
        }
        const activator = require('../lifecycle/network_activator');
        const active = await activator.activate(conosciuta.id, code, { remember: data && data.remember === true });
        return { success: true, code, registered: true, active };
    });
}

function exportArchive(event, data) {
    return _guarded(async () => {
        const { isSuperadmin } = require('../../core/access_guard');
        if (!networkSession.isActive()) {
            const err = new Error('NETWORK_NOT_ACTIVE');
            err.isExpected = true;
            throw err;
        }
        if (!isSuperadmin()) {
            const err = new Error('FORBIDDEN');
            err.isExpected = true;
            throw err;
        }
        const { dialog, BrowserWindow } = require('electron');
        const finestra = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        const scelta = await dialog.showOpenDialog(finestra, {
            title: 'Scegli dove salvare la copia di sicurezza',
            properties: ['openDirectory', 'createDirectory'],
            buttonLabel: 'Salva qui'
        });
        if (scelta.canceled || !scelta.filePaths || scelta.filePaths.length === 0) {
            return { success: false, canceled: true };
        }
        const esito = require('../recovery/archive_exporter').esportaArchivio(scelta.filePaths[0]);
        return { success: true, ...esito };
    });
}

function getQuorum() {
    return _guarded(async () => ({
        success: true,
        policy: quorumPolicy.getPolicy(),
        state: quorumEvaluator.evaluate()
    }));
}

function setQuorum(event, data) {
    return _guarded(async () => {
        const sessionManager = require('../../core/session_manager');
        const policy = await quorumPolicy.setPolicy({
            minNodes: data && Number(data.minNodes),
            enforcement: data && data.enforcement,
            graceMs: data && Number(data.graceMs)
        }, sessionManager.getCurrentUserId());
        return { success: true, policy, state: quorumEvaluator.evaluate() };
    });
}

async function applyPendingPolicy(actorUserId) {
    const entry = registry.getById(networkSession.getActiveId());
    if (!entry || !entry.pendingMinNodes) return false;
    const current = quorumPolicy.getPolicy();
    await quorumPolicy.setPolicy({
        minNodes: Number(entry.pendingMinNodes),
        enforcement: Number(entry.pendingMinNodes) > 1 ? 'hard' : 'soft',
        graceMs: current.graceMs
    }, actorUserId);
    registry.update(entry.id, () => ({ pendingMinNodes: null }));
    return true;
}

function previewCode(event, data) {
    return _guarded(async () => {
        const normalized = identity.normalizeCode(data && data.code);
        if (!normalized) throw identity.invalidCodeError();
        const known = registry.findByPublicId(identity.publicIdOf(normalized));
        return { success: true, alreadyRegistered: Boolean(known), network: known ? _toPublic(known) : null };
    });
}

module.exports = {
    list,
    getActive,
    create,
    join,
    activate,
    deactivate,
    rename,
    remove,
    setRememberCode,
    setAutoStart,
    revealCode,
    createRecoveryKit,
    exportArchive,
    inspectRecoveryShares,
    restoreFromRecoveryKit,
    getQuorum,
    setQuorum,
    applyPendingPolicy,
    previewCode
};
