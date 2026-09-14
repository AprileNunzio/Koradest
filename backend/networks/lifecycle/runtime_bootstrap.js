'use strict';

function _step(label, fn) {
    try {
        const result = fn();
        if (result && typeof result.catch === 'function') {
            result.catch(e => console.error('[NetworkBootstrap] ' + label + ':', e.message));
        }
    } catch (e) {
        console.error('[NetworkBootstrap] ' + label + ':', e.message);
    }
}

function startNetworking() {
    const p2p = require('../../p2p/index');
    _step('regole firewall', () => p2p.ensureFirewallRules());
    p2p.startSyncServer();
    try {
        const path = require('path');
        const { app } = require('electron');
        const nodeId = require('../../core/node_identity').getNodeId();
        require('../../db/crdtEngine').setNodeId(nodeId);
        require('../../p2p/discovery/peerDiscovery').start(nodeId);
        require('../../p2p/storage/fileTransferProtocol').startServer(path.join(app.getPath('userData'), 'p2p_storage'));
    } catch (e) {
        console.error('[NetworkBootstrap] Servizi P2P ausiliari non avviati:', e.message);
    }
}

async function loadDomainServices() {
    try {
        await require('../../core/AppLoader').loadAllInstalledApps();
    } catch (e) {
        console.error('[NetworkBootstrap] Caricamento applicazioni fallito:', e.message);
    }
    _step('riconciliazione utenti', () => {
        const anagrafica = require('../../handlers/anagrafica_persone');
        if (typeof anagrafica.reconcileActiveUsers === 'function') anagrafica.reconcileActiveUsers();
    });
    _step('sincronizzazione permessi', () => require('../../handlers/rbac').syncPermissionsFromManifests());
}

function startBackgroundDaemons() {
    _step('quorum watcher', () => require('../quorum/quorum_watcher').start());
    _step('rotazione backup', () => require('../../security/developer_vault').rotateVault());
    _step('conservazione dati', () => require('../../security/gdpr/retention_runner').avvia());
    _step('drift detector', () => {
        const drift = require('../../core/clusterStateDriftDetector');
        drift.startBackgroundDriftDaemon(300000);
        drift.checkClusterStateDrift().catch(() => {});
    });
    _step('health doctor', () => {
        const doctor = require('../../core/proactiveHealthDoctor');
        doctor.startProactiveDoctor(600000);
        doctor.runPreventiveMaintenance().catch(() => {});
    });
    _step('cache marketplace', () => {
        const store = require('../../handlers/store');
        store.preloadMarketplaceCache()
            .then(() => store.syncNetworkApps())
            .then(() => require('../../core/AppUpdateManager').startBackgroundCheck())
            .catch(() => {});
    });
}

async function bootstrapRuntime() {
    startNetworking();
    await loadDomainServices();
    startBackgroundDaemons();
    return true;
}

module.exports = { bootstrapRuntime, startNetworking, loadDomainServices, startBackgroundDaemons };
