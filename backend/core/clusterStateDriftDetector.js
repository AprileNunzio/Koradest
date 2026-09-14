'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const dbManager = require('../db/db_manager');
const AppLoader = require('./AppLoader');
const appPackageFetcher = require('./appPackageFetcher');
const appsRegistry = require('./appsRegistry');
const clusterAppLifecycle = require('./clusterAppLifecycle');
const bus = require('./event_bus');

let driftDaemonTimer = null;

function radiceUtente() {
    try {
        return app.getPath('userData');
    } catch (_) {
        return process.cwd();
    }
}

function getStoreDB() {
    try {
        return dbManager.getDB('store');
    } catch (_) {
        return null;
    }
}

function computeFileHash(filePath) {
    try {
        if (!filePath || !fs.existsSync(filePath)) return null;
        const buf = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(buf).digest('hex');
    } catch (_) {
        return null;
    }
}

function getStateMerkleRoot() {
    try {
        const db = getStoreDB();
        if (!db) return null;

        const rows = db.query("SELECT app_id, version, status, is_deleted FROM installed_apps WHERE status = 'active' AND (is_deleted IS NULL OR is_deleted = 0) ORDER BY app_id ASC") || [];
        const hashes = [];

        const userAppsPath = path.join(radiceUtente(), 'installed_apps');
        for (const row of rows) {
            const mPath = path.join(userAppsPath, row.app_id, 'manifest.json');
            const mHash = computeFileHash(mPath) || 'missing';
            const dbPath = path.join(dbManager.basePath || '', 'app_' + row.app_id + '.enc');
            const dbHash = fs.existsSync(dbPath) ? 'present' : 'none';
            const itemString = row.app_id + ':' + row.version + ':' + mHash + ':' + dbHash;
            hashes.push(crypto.createHash('sha256').update(itemString).digest('hex'));
        }

        if (hashes.length === 0) return crypto.createHash('sha256').update('empty_cluster_state').digest('hex');
        return crypto.createHash('sha256').update(hashes.join(':')).digest('hex');
    } catch (_) {
        return null;
    }
}

async function checkClusterStateDrift() {
    try {
        const db = getStoreDB();
        if (!db) return { status: 'ERROR', driftDetected: false, repairedApps: [], errors: ['Database non disponibile'] };

        const activeRows = db.query("SELECT app_id, version FROM installed_apps WHERE status = 'active' AND (is_deleted IS NULL OR is_deleted = 0)") || [];
        const userAppsPath = path.join(radiceUtente(), 'installed_apps');
        const availableManifests = await appsRegistry.getAppsRegistry();

        const repairedApps = [];
        const errors = [];
        let driftDetected = false;

        for (const row of activeRows) {
            if (clusterAppLifecycle.isCoreApp(row.app_id)) continue;

            const appDir = path.join(userAppsPath, row.app_id);
            const manifestPath = path.join(appDir, 'manifest.json');

            let needsRepair = false;
            if (!fs.existsSync(appDir) || !fs.existsSync(manifestPath)) {
                needsRepair = true;
            } else {
                try {
                    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    if (!parsed || (parsed.id !== row.app_id && parsed.folder !== row.app_id)) {
                        needsRepair = true;
                    }
                } catch (_) {
                    needsRepair = true;
                }
            }

            if (needsRepair) {
                driftDetected = true;
                try {
                    const targetManifest = availableManifests.find(m => m.id === row.app_id) || { id: row.app_id, version: row.version };
                    const { stagingDir } = await appPackageFetcher.acquisisci(row.app_id, targetManifest);
                    if (stagingDir && fs.existsSync(stagingDir)) {
                        if (fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true, force: true });
                        fs.mkdirSync(path.dirname(appDir), { recursive: true });
                        fs.renameSync(stagingDir, appDir);
                        appPackageFetcher.pulisciStagingResidui();
                        await AppLoader.loadApp(targetManifest);
                        repairedApps.push(row.app_id);
                    }
                } catch (repairErr) {
                    errors.push('Ripristino fallito per ' + row.app_id + ': ' + repairErr.message);
                }
            }
        }

        const stateHash = getStateMerkleRoot();

        if (driftDetected && repairedApps.length > 0) {
            bus.publish('store:drift-repaired', { repairedApps, stateHash });
            try {
                clusterAppLifecycle.recordDistributedAuditLog('drift_detector', 'SELF_HEALING_REPAIR', 'multiple', { repairedApps, stateHash });
            } catch (_) {}
        }

        return {
            status: errors.length > 0 ? 'PARTIAL_REPAIR' : (driftDetected ? 'DRIFT_REPAIRED' : 'HEALTHY'),
            driftDetected,
            repairedApps,
            errors,
            stateHash
        };
    } catch (e) {
        return { status: 'ERROR', driftDetected: false, repairedApps: [], errors: [e.message] };
    }
}

function startBackgroundDriftDaemon(intervalMs = 300000) {
    try {
        if (driftDaemonTimer) clearInterval(driftDaemonTimer);
        driftDaemonTimer = setInterval(() => {
            checkClusterStateDrift().catch(() => {});
        }, intervalMs);
    } catch (_) {}
}

function stopBackgroundDriftDaemon() {
    try {
        if (driftDaemonTimer) {
            clearInterval(driftDaemonTimer);
            driftDaemonTimer = null;
        }
    } catch (_) {}
}

module.exports = {
    checkClusterStateDrift,
    getStateMerkleRoot,
    startBackgroundDriftDaemon,
    stopBackgroundDriftDaemon
};
