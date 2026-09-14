'use strict';
const dbManager = require('../../db/db_manager');
const networkSession = require('../session/network_session');

function _step(label, fn) {
    try {
        const result = fn();
        if (result && typeof result.catch === 'function') {
            result.catch(e => console.error('[NetworkTeardown] ' + label + ':', e.message));
        }
    } catch (e) {
        console.error('[NetworkTeardown] ' + label + ':', e.message);
    }
}

function stopBackgroundDaemons() {
    _step('quorum watcher', () => require('../quorum/quorum_watcher').stop());
    _step('conservazione dati', () => require('../../security/gdpr/retention_runner').ferma());
    _step('drift detector', () => require('../../core/clusterStateDriftDetector').stopBackgroundDriftDaemon());
    _step('health doctor', () => require('../../core/proactiveHealthDoctor').stopProactiveDoctor());
}

async function unloadApps() {
    try {
        const AppLoader = require('../../core/AppLoader');
        const loaded = AppLoader.getLoaded() || [];
        for (const entry of loaded) {
            const appId = typeof entry === 'string' ? entry : (entry && entry.id);
            if (!appId) continue;
            try { await AppLoader.unloadApp(appId); } catch (_) {}
        }
        return true;
    } catch (_) {
        return false;
    }
}

function stopNetworking() {
    _step('server P2P', () => require('../../p2p/index').stopSyncServer());
    _step('peer discovery', () => require('../../p2p/discovery/peerDiscovery').stop());
    _step('file transfer', () => require('../../p2p/storage/fileTransferProtocol').stopServer());
}

function clearUserSession() {
    _step('sessione utente', () => require('../../core/session_manager').clearSession());
}

function notifyRenderer(channel, payload) {
    try {
        const { BrowserWindow } = require('electron');
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) win.webContents.send(channel, payload);
        }
    } catch (_) {}
}

async function teardownRuntime() {
    stopBackgroundDaemons();
    clearUserSession();
    await unloadApps();
    stopNetworking();
    try {
        await dbManager.saveAll(true);
    } catch (e) {
        console.error('[NetworkTeardown] Salvataggio finale non riuscito:', e.message);
    }
    dbManager.closeAll();
    _step('thread crittografico', () => require('../../db/crypto_worker').chiudi());
    networkSession.clear();
    notifyRenderer('network:deactivated', {});
    return true;
}

module.exports = { teardownRuntime, stopBackgroundDaemons, stopNetworking, unloadApps, clearUserSession, notifyRenderer };
