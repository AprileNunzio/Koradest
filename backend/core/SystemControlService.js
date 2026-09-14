'use strict';

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class SystemControlService {
    async getDiagnostics() {
        try {
            const os = require('os');
            const capabilityBroker = require('../security/capabilityBroker');
            const AppLoader = require('./AppLoader');
            const appsRegistry = require('./appsRegistry');
            const AppUpdateManager = require('./AppUpdateManager');
            const sync = require('../sync');
            const { getDB } = require('../db');

            const allApps = await appsRegistry.getAppsRegistry();
            const userAppsPath = path.join(app.getPath('userData'), 'installed_apps');
            const installedOnDisk = fs.existsSync(userAppsPath)
                ? fs.readdirSync(userAppsPath, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
                : [];

            const brokerRegistered = {};
            capabilityBroker.registeredHandlers.forEach((actionsMap, appId) => {
                brokerRegistered[appId] = Array.from(actionsMap.keys());
            });

            const dbStatus = {};
            ['core', 'store', 'anagrafica', 'presa_servizio'].forEach(name => {
                try {
                    const db = getDB(name);
                    dbStatus[name] = db ? { connected: true, tables: db.query("SELECT name FROM sqlite_master WHERE type = 'table'").map(t => t.name) } : { connected: false };
                } catch (e) {
                    dbStatus[name] = { connected: false, error: e.message };
                }
            });

            const peers = sync.getDetailedNodes ? sync.getDetailedNodes() : [];

            return {
                timestamp: Date.now(),
                system: {
                    version: app.getVersion(),
                    electron: process.versions.electron,
                    node: process.versions.node,
                    platform: process.platform,
                    arch: process.arch,
                    uptimeSeconds: Math.round(process.uptime()),
                    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
                    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
                    userDataPath: app.getPath('userData'),
                    appDataPath: app.getPath('appData')
                },
                networkMesh: {
                    nodeId: sync.getNodeId ? sync.getNodeId() : 'unknown',
                    localIPs: sync.getLocalIPs ? sync.getLocalIPs() : [],
                    peersCount: peers.length,
                    peers: peers
                },
                broker: {
                    registeredTargetsCount: capabilityBroker.registeredHandlers.size,
                    registeredTargets: brokerRegistered,
                    activeTokens: Array.from(capabilityBroker.appTokens.keys())
                },
                apps: {
                    totalDiscovered: allApps.length,
                    loadedInLoader: AppLoader.getLoaded ? AppLoader.getLoaded() : [],
                    installedOnDisk: installedOnDisk,
                    catalog: allApps.map(a => ({
                        id: a.id,
                        folder: a.folder,
                        version: a.version,
                        core: !!a.core,
                        bundled: !!a.bundled,
                        backend: a.backend || 'backend.js',
                        ipcNamespace: a.ipc && a.ipc.namespace
                    }))
                },
                databases: dbStatus,
                hardwareProfile: (() => {
                    try {
                        const hardwareProfiler = require('./HardwareProfiler');
                        return hardwareProfiler.getProfile();
                    } catch (_) { return null; }
                })(),
                proactiveDoctor: (() => {
                    try {
                        const doctor = require('./proactiveHealthDoctor');
                        return doctor.getDoctorReport();
                    } catch (_) { return null; }
                })(),
                updates: {
                    queue: AppUpdateManager.getQueueStatus ? AppUpdateManager.getQueueStatus() : []
                }
            };

        } catch (e) {
            return { error: e.message, stack: e.stack };
        }
    }

    relaunch() {
        try {
            app.relaunch();
            app.exit(0);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async forceReloadApp(appId) {
        try {
            const AppLoader = require('./AppLoader');
            const appsRegistry = require('./appsRegistry');
            await AppLoader.unloadApp(appId);

            const allApps = await appsRegistry.getAppsRegistry();
            const manifest = allApps.find(m => m.id === appId || m.folder === appId || (m.ipc && m.ipc.namespace === appId));
            if (!manifest) {
                return { success: false, error: `Manifest non trovato per app ${appId}` };
            }

            const loaded = await AppLoader.loadApp(manifest);
            return { success: loaded, manifest: manifest.id };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async testAppAction(targetAppId, action, payload = {}) {
        const start = Date.now();
        try {
            const capabilityBroker = require('../security/capabilityBroker');
            const result = await capabilityBroker.routeIpcCall('core', targetAppId, action, payload, { origin: 'main' });
            return {
                success: true,
                durationMs: Date.now() - start,
                targetApp: targetAppId,
                action,
                data: result
            };
        } catch (e) {
            return {
                success: false,
                durationMs: Date.now() - start,
                targetApp: targetAppId,
                action,
                error: e.message
            };
        }
    }
}

module.exports = new SystemControlService();
