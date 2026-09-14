'use strict';
const { attachToServer, detach: detachWsServer } = require('./transport/ws_server');
const { startUdpListener } = require('./discovery/udp_broadcaster');
const { publish: publishMdns } = require('./discovery/mdns_resolver');
const { start: startDiscovery, stop: stopDiscovery, runDiscovery } = require('./discovery/discovery_coordinator');
const { start: startAntiEntropy, stop: stopAntiEntropy } = require('../dag/sync/anti_entropy');
const { start: startWatchdog, stop: stopWatchdog } = require('./resilience/watchdog');
const { ensureFirewallRules } = require('./firewall/windows_firewall');
const { loadPeers, savePeers } = require('./peers/peer_cache');
const { loadFromCache, getAllPeers, getDetailedPeers, getPexPeers, clearPeers } = require('./peers/peer_registry');
const { syncWithPeer, fullResync } = require('../dag/sync/sync_coordinator');
const { PORT, UDP_PORT, PROTOCOL_VERSION, SERVICE_NAME, PORT_FALLBACK_ATTEMPTS } = require('./protocol/constants');
const { getNetworkName, getNodeId } = require('../core/node_identity');
const { getCurrentTips } = require('../dag/graph/dag_tips');
const bus = require('../core/event_bus');
const express = require('express');
const cors = require('cors');
const http = require('http');
const networkSession = require('../networks/session/network_session');
let _server = null;
let _udpServer = null;
let _mdnsInstance = null;
let _peerPersistTimer = null;
let _listenAttempt = 0;
let _boundPort = PORT;
let _syncState = 'Sincronizzato';
const _rateLimitMap = new Map();
function _rateLimit(ip, limit, windowMs) {
    try {
        const now = Date.now();
        const e = _rateLimitMap.get(ip) || { n: 0, until: now + windowMs };
        if (now > e.until) { e.n = 0; e.until = now + windowMs; }
        e.n++;
        _rateLimitMap.set(ip, e);
        return e.n > limit;
    } catch (_) { return false; }
}
function _rlMiddleware(limit, windowMs) {
    return (req, res, next) => {
        try {
            const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
            if (_rateLimit(ip, limit, windowMs)) return res.status(429).json({ error: 'Too Many Requests' });
            next();
        } catch (_) { next(); }
    };
}
function getBoundPort() { return _boundPort; }
bus.subscribe('sync:state', ({ state }) => { _syncState = state; });
bus.subscribe('peer:discovered', (peer) => {
    try {
        if (peer && peer.ip && peer.ip !== '127.0.0.1') {
            const { syncWithPeer } = require('../dag/sync/sync_coordinator');
            const delay = (peer.source === 'pex' || peer.source === 'manual') ? Math.random() * 1500 : 500 + Math.random() * 1500;
            setTimeout(() => {
                try {
                    syncWithPeer(peer.ip, peer.port || PORT).catch(() => {});
                } catch (_) {}
            }, delay);
        }
    } catch (_) {}
});
function getSyncState() { return _syncState; }
function getConnectedNodesCount() {
    try {
        const { PEER_HEARTBEAT_TTL_MS } = require('./protocol/constants');
        const now = Date.now();
        return getAllPeers().filter(p => p.state === 'SYNCED' && now - p.lastSeen < PEER_HEARTBEAT_TTL_MS).length;
    } catch (_) {
        return 0;
    }
}
function getDetailedNodes() {
    return getDetailedPeers();
}
function loadPeerCache() {
    try {
        const peers = loadPeers();
        if (peers && peers.length > 0) loadFromCache(peers);
    } catch (e) {
        console.error('[P2P] loadPeerCache error:', e.message);
    }
}
function announceLocalUpdate(version) {
    try {
        const { broadcast } = require('./discovery/udp_broadcaster');
        broadcast(`UPDATE_AVAILABLE_P2P:${version}`, UDP_PORT, 3000).catch(() => {});
    } catch (_) {}
}
function broadcastUpdateAvailable(version) { announceLocalUpdate(version); }
function announceAppUpdate(appId, version) {
    try {
        if (!appId || !version) return false;
        const { computeBroadcastToken } = require('./network_auth');
        const corpo = `APP_UPDATED_P2P:${appId}:${version}`;
        const token = computeBroadcastToken(corpo);
        if (!token) return false;
        const { broadcast } = require('./discovery/udp_broadcaster');
        broadcast(`APP_UPDATED_P2P:${token}:${appId}:${version}`, UDP_PORT, 2000).catch(() => {});
        console.log(`[P2P] Annunciato in LAN l'aggiornamento di ${appId} alla ${version}.`);
        return true;
    } catch (e) {
        console.error('[P2P] announceAppUpdate error:', e.message);
        return false;
    }
}
function broadcastForceResync() {
    try {
        const { computeBroadcastToken } = require('./network_auth');
        const token = computeBroadcastToken('FORCE_RESYNC_P2P');
        if (!token) { console.error('[P2P] Impossibile calcolare il token di broadcast: rete non inizializzata.'); return; }
        const { broadcast } = require('./discovery/udp_broadcaster');
        broadcast(`FORCE_RESYNC_P2P:${token}`, UDP_PORT, 2000).catch(() => {});
        console.log('[P2P] Inviato comando FORCE_RESYNC_P2P in broadcast LAN.');
    } catch (e) {
        console.error('[P2P] broadcastForceResync error:', e.message);
    }
}
let _ultimoErroreResync = '';

function ultimoErroreResync() {
    return _ultimoErroreResync;
}

async function safeTriggerResync(ip, port) {
    if (!ip) {
        _ultimoErroreResync = 'Indirizzo del nodo mancante';
        return false;
    }
    try {
        const { app: electronApp } = require('electron');
        const path = require('path');
        const BackupManager = require('../db/backup_manager');
        const { getNetworkName } = require('../core/node_identity');
        const networkName = getNetworkName() || 'default';
        const safeNode = networkName.replace(/[^a-zA-Z0-9_-]/g, '');
        const basePath = path.join(electronApp.getPath('userData'), 'dbs', safeNode);
        BackupManager.createPreSyncCheckpoint(basePath);
        const esito = await fullResync(ip, port || PORT);
        _ultimoErroreResync = esito
            ? ''
            : `Il nodo ${ip}:${port || PORT} non ha completato la sincronizzazione: verifica che sia acceso, sulla stessa rete e con lo stesso codice di rete.`;
        return esito;
    } catch (e) {
        _ultimoErroreResync = e.message || 'Errore imprevisto durante la sincronizzazione';
        console.error('[P2P] safeTriggerResync error:', e);
        return false;
    }
}
async function triggerFullResync(ip, port) {
    return safeTriggerResync(ip, port || PORT);
}
function startSyncServer() {
    if (_server) return _server;
    if (!networkSession.isActive()) {
        console.warn('[P2P] Avvio ignorato: nessuna rete blockchain attiva.');
        return null;
    }
    try {
        const app = express();
        app.use(cors({ origin: false }));
        app.use(express.json({ limit: '50mb' }));
        app.get('/ping', async (req, res) => {
            try {
                let callerIp = req.socket.remoteAddress;
                if (callerIp && callerIp.includes('::ffff:')) callerIp = callerIp.split('::ffff:')[1];
                if (callerIp && callerIp !== '127.0.0.1') {
                    try {
                        const { updatePeerMeta } = require('./peers/peer_registry');
                        updatePeerMeta(callerIp, {});
                    } catch (_) {}
                }
                const { checkIsRegistered } = require('../handlers/auth');
                const { getTotalBlocksCount } = require('../dag/graph/dag_store');
                const { app: electronApp } = require('electron');
                const { getPendingUpdateVersion } = require('../core/updaterService');
                const isInitialized = await checkIsRegistered();
                res.json({ status: 'ok', node: getNetworkName(), protocolVersion: PROTOCOL_VERSION, appVersion: electronApp.getVersion(), nodeId: getNodeId(), isInitialized, networkPublicId: networkSession.getActivePublicId(), blockCount: getTotalBlocksCount(), updateReadyVersion: typeof getPendingUpdateVersion === 'function' ? getPendingUpdateVersion() : null });
            } catch (e) {
                res.status(500).json({ error: 'Internal error' });
            }
        });
        app.get('/sync/app-package/:appId', async (req, res) => {
            try {
                const { verifyNetworkHash } = require('./network_auth');
                const providedHash = req.headers['x-koradest-network'];
                const authorized = await verifyNetworkHash(providedHash);
                if (!authorized) return res.status(403).json({ error: 'Network code mismatch' });
                const appId = req.params.appId;
                if (!appId || appId.includes('..') || appId.includes('/') || appId.includes('\\')) {
                    return res.status(400).json({ error: 'Invalid appId' });
                }
                const fs = require('fs');
                const AdmZip = require('adm-zip');
                const appsRegistry = require('../core/appsRegistry');
                const manifests = await appsRegistry.getAppsRegistry();
                const manifest = manifests.find(m => m.id === appId);
                if (!manifest || !manifest.appPath) {
                    return res.status(404).json({ error: 'App not found on this node' });
                }
                const appDir = manifest.appPath;
                if (!fs.existsSync(appDir)) {
                    return res.status(404).json({ error: 'App physically not found' });
                }
                const versioneRichiesta = req.query && req.query.version ? String(req.query.version) : null;
                const versioneLocale = manifest.version ? String(manifest.version) : null;
                if (versioneRichiesta && versioneRichiesta !== versioneLocale) {
                    return res.status(409).json({
                        error: 'Version mismatch',
                        requested: versioneRichiesta,
                        available: versioneLocale
                    });
                }
                const zip = new AdmZip();
                zip.addLocalFolder(appDir);
                const buffer = zip.toBuffer();
                res.set('Content-Type', 'application/zip');
                res.set('Content-Disposition', `attachment; filename=${appId}.zip`);
                res.set('Content-Length', buffer.length);
                if (versioneLocale) res.set('x-koradest-app-version', versioneLocale);
                res.send(buffer);
            } catch (e) {
                console.error('[P2P] Errore /sync/app-package:', e);
                res.status(500).json({ error: 'Internal error processing zip' });
            }
        });
        app.post('/sync/resync', _rlMiddleware(5, 60000), async (req, res) => {
            try {
                const { verifyNetworkHash } = require('./network_auth');
                const providedHash = req.headers['x-koradest-network'];
                const authorized = await verifyNetworkHash(providedHash);
                if (!authorized) return res.status(403).json({ error: 'Network code mismatch' });
                const senderIp = req.body && req.body.senderIp;
                if (!senderIp || !/^\d{1,3}(\.\d{1,3}){3}$/.test(senderIp)) return res.status(400).json({ error: 'Invalid senderIp' });
                res.json({ status: 'accepted', message: 'Resync in corso...' });
                setTimeout(() => safeTriggerResync(senderIp, PORT), 500);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/health', (req, res) => {
            try {
                const { check } = require('../observability/health_checker');
                res.json(check());
            } catch (_) {
                res.json({ status: 'degraded' });
            }
        });
        app.use('/api/network-test', require('../network_test_api').createRouter());
        app.get('/sync/clone-bundle', _rlMiddleware(10, 60000), async (req, res) => {
            try {
                const { handleCloneBundle } = require('./sync/clone_bundle_handler');
                await handleCloneBundle(req, res);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/clone', _rlMiddleware(10, 60000), async (req, res) => {
            try {
                const { verifyNetworkHash } = require('./network_auth');
                const authorized = await verifyNetworkHash(req.headers['x-koradest-network']);
                if (!authorized) return res.status(403).json({ error: 'Network code mismatch' });
                const { getDB } = require('../db');
                const ledger = getDB('ledger');
                const buffer = ledger.exportData();
                res.set('Content-Type', 'application/octet-stream');
                res.send(buffer);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/clone-auth', _rlMiddleware(10, 60000), async (req, res) => {
            try {
                const { verifyNetworkHash } = require('./network_auth');
                const authorized = await verifyNetworkHash(req.headers['x-koradest-network']);
                if (!authorized) return res.status(403).json({ error: 'Network code mismatch' });
                const { getDB } = require('../db');
                const authDb = getDB('auth');
                const buffer = authDb.exportData();
                res.set('Content-Type', 'application/octet-stream');
                res.send(buffer);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/update-info', (req, res) => {
            try {
                const updatesManager = require('../updates_manager');
                const { app: electronApp } = require('electron');
                const highestLocal = updatesManager.getHighestLocalVersion();
                const currentApp = electronApp.getVersion();
                const v = highestLocal || currentApp;
                const sha512 = highestLocal ? updatesManager.getLocalChecksum(highestLocal) : null;
                res.json({ version: v, sha512: sha512 });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/update/download/:version', (req, res) => {
            try {
                if (!/^\d+\.\d+\.\d+$/.test(req.params.version)) return res.status(400).json({ error: 'Invalid version' });
                const updatesManager = require('../updates_manager');
                const filePath = updatesManager.getInstallerPath(req.params.version);
                if (!filePath) return res.status(404).json({ error: 'Not found' });
                res.sendFile(filePath);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/update', (req, res) => {
            try {
                const updatesManager = require('../updates_manager');
                const version = updatesManager.getHighestLocalVersion();
                const filePath = version ? updatesManager.getInstallerPath(version) : null;
                if (!filePath) return res.status(404).json({ error: 'Not found' });
                res.sendFile(filePath);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/blob/:hash', (req, res) => {
            try {
                const { app: electronApp } = require('electron');
                const safeHash = (req.params.hash || '').replace(/[^a-zA-Z0-9_-]/g, '');
                if (!safeHash) return res.status(400).json({ error: 'Invalid hash' });
                const blobDir = path.join(electronApp.getPath('userData'), 'storage', 'blobs');
                const blobPath = path.join(blobDir, safeHash);
                if (!fs.existsSync(blobPath)) {
                    return res.status(404).json({ error: 'Blob not found' });
                }
                res.sendFile(blobPath);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        app.get('/sync/blob/exists/:hash', (req, res) => {
            try {
                const { app: electronApp } = require('electron');
                const safeHash = (req.params.hash || '').replace(/[^a-zA-Z0-9_-]/g, '');
                const blobDir = path.join(electronApp.getPath('userData'), 'storage', 'blobs');
                const blobPath = path.join(blobDir, safeHash);
                res.json({ exists: fs.existsSync(blobPath) });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        _server = http.createServer(app);
        attachToServer(_server);
        _listenAttempt = 0;
        const _tryListen = (port) => {
            _boundPort = port;
            _server.listen(port, '0.0.0.0');
        };
        _server.on('listening', () => {
            console.log(`[P2P] Server WebSocket in ascolto su porta ${_boundPort}`);
            _udpServer = startUdpListener(UDP_PORT, getNodeId, getNetworkName, PROTOCOL_VERSION, (version, senderIp) => {
                try { require('../core/updaterService').maybeAdoptLanUpdate(version, senderIp, _boundPort); } catch (_) {}
            }, (senderIp, token) => {
                try {
                    const { verifyBroadcastToken } = require('./network_auth');
                    if (!verifyBroadcastToken('FORCE_RESYNC_P2P', token)) {
                        console.warn(`[P2P] FORCE_RESYNC_P2P scartato: token non valido da ${senderIp}`);
                        return;
                    }
                    forceNukeAndClone(senderIp, _boundPort);
                } catch (e) {
                    console.error('[P2P] Errore verifica FORCE_RESYNC_P2P:', e.message);
                }
            }, () => _boundPort, (token, appId, version, senderIp) => {
                try {
                    const { verifyBroadcastToken } = require('./network_auth');
                    if (!verifyBroadcastToken(`APP_UPDATED_P2P:${appId}:${version}`, token)) {
                        console.warn(`[P2P] APP_UPDATED_P2P scartato: token non valido da ${senderIp}`);
                        return;
                    }
                    require('../core/AppUpdateManager').controlloDaRete(appId, version, senderIp);
                } catch (e) {
                    console.error('[P2P] Errore verifica APP_UPDATED_P2P:', e.message);
                }
            });
            const networkName = getNetworkName();
            publishMdns(networkName ? `${SERVICE_NAME}-${networkName}` : SERVICE_NAME, _boundPort)
                .then((instance) => { _mdnsInstance = instance; })
                .catch(() => {});
            startDiscovery();
        });
        _server.on('error', (e) => {
            if (e.code === 'EADDRINUSE' && _listenAttempt < PORT_FALLBACK_ATTEMPTS - 1) {
                _listenAttempt++;
                const nextPort = PORT + _listenAttempt;
                console.warn(`[P2P] Porta ${_boundPort} occupata, tentativo su ${nextPort}...`);
                setTimeout(() => _tryListen(nextPort), 200);
            } else if (e.code === 'EADDRINUSE') {
                console.error(`[P2P] Nessuna porta libera nell'intervallo ${PORT}-${PORT + PORT_FALLBACK_ATTEMPTS - 1}.`);
            } else {
                console.error('[P2P] Server error:', e.message);
            }
        });
        _tryListen(PORT);
        startAntiEntropy();
        startWatchdog();
        try { const { app: electronApp } = require('electron'); announceLocalUpdate(electronApp.getVersion()); } catch (_) {}
        bus.subscribe('watchdog:stale', () => {
            const peers = getDetailedNodes().filter(p => p.ip !== '127.0.0.1');
            for (const peer of peers.slice(0, 3)) {
                syncWithPeer(peer.ip, peer.port || PORT).catch(() => {});
            }
        });
        loadPeerCache();
        _peerPersistTimer = setInterval(() => savePeers(getAllPeers()), 60000);
        if (typeof _peerPersistTimer.unref === 'function') _peerPersistTimer.unref();
        return _server;
    } catch (e) {
        console.error('[P2P] startSyncServer error:', e.message);
        return null;
    }
}
function stopSyncServer() {
    stopAntiEntropy();
    stopWatchdog();
    stopDiscovery();
    if (_peerPersistTimer) {
        clearInterval(_peerPersistTimer);
        _peerPersistTimer = null;
    }
    try { savePeers(getAllPeers()); } catch (_) {}
    if (_udpServer) {
        try { _udpServer.close(); } catch (_) {}
        _udpServer = null;
    }
    if (_mdnsInstance) {
        try { _mdnsInstance.destroy(); } catch (_) {}
        _mdnsInstance = null;
    }
    try { require('./transport/connection_pool').closeAll(); } catch (_) {}
    try { detachWsServer(); } catch (_) {}
    if (_server) {
        try { _server.close(); } catch (_) {}
        _server = null;
    }
    _listenAttempt = 0;
    _boundPort = PORT;
    _rateLimitMap.clear();
    clearPeers();
    _syncState = 'Sincronizzato';
    return true;
}
const ensureFirewallRule = ensureFirewallRules;
module.exports = {
    startSyncServer,
    stopSyncServer,
    loadPeerCache, announceLocalUpdate, broadcastUpdateAvailable, announceAppUpdate, triggerFullResync, ultimoErroreResync, broadcastForceResync,
    getConnectedNodesCount,
    getSyncState,
    getDetailedNodes,
    getBoundPort,
    ensureFirewallRule, ensureFirewallRules,
    scanForNodes: runDiscovery,
    PROTOCOL_VERSION, PORT
};
