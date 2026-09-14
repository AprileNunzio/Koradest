'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app, BrowserWindow } = require('electron');
const appDataPurger = require('./appDataPurger');
const AppLoader = require('./AppLoader');
const AppDbManager = require('./AppDbManager');
const bus = require('./event_bus');
const auditLogger = require('../observability/auditLogger');
const dbManager = require('../db/db_manager');

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

function getAuthDB() {
    try {
        return dbManager.getDB('auth');
    } catch (_) {
        return null;
    }
}

function isCoreApp(appId) {
    try {
        const coreIds = new Set(['anagrafica', 'azienda', 'store', 'auth', 'impostazioni', 'rubrica', 'core']);
        if (coreIds.has(String(appId).toLowerCase())) return true;
        const loadedManifest = AppLoader.getManifest(appId);
        return !!(loadedManifest && (loadedManifest.core || loadedManifest.bundled));
    } catch (_) {
        return false;
    }
}

function recordDistributedAuditLog(actorId, action, targetAppId, details, result = 'SUCCESS') {
    try {
        const authDb = getAuthDB();
        const ts = Math.floor(Date.now() / 1000);
        const logId = 'dlog_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

        if (authDb) {
            authDb.run(
                'INSERT OR REPLACE INTO distributed_logs (id, actor_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)',
                [logId, String(actorId || 'system'), String(action), detailStr, ts]
            );
            dbManager.saveDatabase('auth');
        }

        try {
            const { wrapMutationWithEvent } = require('../db');
            wrapMutationWithEvent('INSERT', 'distributed_logs', logId, {
                id: logId,
                actor_id: String(actorId || 'system'),
                action: String(action),
                details: detailStr,
                created_at: ts
            });
        } catch (_) {}

        return true;
    } catch (_) {
        return false;
    }
}

async function handleRemoteAppUninstall(appId) {
    try {
        if (!appId || isCoreApp(appId)) return false;

        const loadedManifest = AppLoader.getManifest(appId);
        await AppLoader.unloadApp(appId);

        const purgaResult = appDataPurger.purga(appId, loadedManifest);

        const db = getStoreDB();
        const ts = Math.floor(Date.now() / 1000);
        if (db) {
            try {
                db.run("UPDATE installed_apps SET status = 'uninstalled', is_deleted = 1, last_modified = ? WHERE app_id = ?", [ts, appId]);
                db.run('DELETE FROM app_dependencies WHERE app_id = ?', [appId]);
                db.run('DELETE FROM app_versioni WHERE app_id = ?', [appId]);
                db.run(
                    'INSERT INTO app_install_log (app_id, action, version, actor_user_id, timestamp, success, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [appId, 'remote_uninstall', loadedManifest ? loadedManifest.version : null, 'cluster_sync', ts, purgaResult.completo ? 1 : 0, null]
                );
                await dbManager.saveDatabase('store');
            } catch (_) {}
        }

        try {
            auditLogger.logEvent('cluster', 'APP_UNINSTALLED_REMOTE', 'app', appId, { complete: purgaResult.completo });
            recordDistributedAuditLog('cluster', 'APP_UNINSTALLED', appId, { complete: purgaResult.completo, timestamp: ts });
        } catch (_) {}

        bus.publish('app:uninstalled', { appId, remote: true });
        bus.publish('store:updated', { appId });

        try {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed()) {
                    w.webContents.send('app-uninstalled', { appId });
                    w.webContents.send('store:app-uninstalled', { appId });
                    w.webContents.send('sync-updated', { table: 'installed_apps' });
                }
            });
        } catch (_) {}

        return purgaResult;
    } catch (e) {
        return false;
    }
}

async function handleRemoteAppInstallOrUpdate(payload) {
    try {
        const appId = payload && (payload.app_id || payload.id);
        if (!appId || isCoreApp(appId)) return false;

        const ts = Math.floor(Date.now() / 1000);
        const db = getStoreDB();
        if (db) {
            try {
                const existing = db.query('SELECT app_id FROM installed_apps WHERE app_id = ?', [appId]);
                if (existing && existing.length > 0) {
                    db.run("UPDATE installed_apps SET version = ?, updated_at = ?, status = 'active', is_deleted = 0, last_modified = ? WHERE app_id = ?", [payload.version || '1.0.0', ts, ts, appId]);
                } else {
                    db.run(
                        "INSERT INTO installed_apps (app_id, version, installed_at, updated_at, status, is_deleted, last_modified) VALUES (?, ?, ?, ?, 'active', 0, ?)",
                        [appId, payload.version || '1.0.0', ts, ts, ts]
                    );
                }
                await dbManager.saveDatabase('store');
            } catch (_) {}
        }

        try {
            recordDistributedAuditLog('cluster', 'APP_SYNC_RECEIVED', appId, { version: payload.version, timestamp: ts });
        } catch (_) {}

        bus.publish('app:sync-received', { appId, version: payload.version });
        bus.publish('store:updated', { appId });

        try {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed()) {
                    w.webContents.send('store:app-update-event', { appId, version: payload.version });
                    w.webContents.send('sync-updated', { table: 'installed_apps' });
                }
            });
        } catch (_) {}

        return true;
    } catch (_) {
        return false;
    }
}

async function reconcileInstalledApps() {
    try {
        const db = getStoreDB();
        if (!db) return { reconciled: 0, removed: [] };

        const activeRows = db.query("SELECT app_id, version FROM installed_apps WHERE status = 'active' AND (is_deleted IS NULL OR is_deleted = 0)");
        const activeIds = new Set((activeRows || []).map(r => r.app_id));

        const userAppsPath = path.join(radiceUtente(), 'installed_apps');
        const removed = [];

        if (fs.existsSync(userAppsPath)) {
            const dirs = fs.readdirSync(userAppsPath, { withFileTypes: true });
            for (const d of dirs) {
                if (!d.isDirectory()) continue;
                let targetId = d.name;
                const mPath = path.join(userAppsPath, d.name, 'manifest.json');
                let manifest = null;
                if (fs.existsSync(mPath)) {
                    try {
                        manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
                        targetId = manifest.id || d.name;
                    } catch (_) {}
                }

                if (!activeIds.has(targetId) && !isCoreApp(targetId)) {
                    await AppLoader.unloadApp(targetId);
                    appDataPurger.purga(targetId, manifest);
                    removed.push(targetId);
                }
            }
        }

        const baseDbPath = dbManager.basePath;
        if (baseDbPath && fs.existsSync(baseDbPath)) {
            const files = fs.readdirSync(baseDbPath);
            for (const file of files) {
                if (file.startsWith('app_') && file.endsWith('.enc')) {
                    const namespace = file.replace(/^app_/, '').replace(/\.enc$/, '');
                    if (namespace === 'anagrafica' || namespace === 'azienda' || namespace === 'data' || namespace === 'store') {
                        continue;
                    }
                    if (!activeIds.has(namespace)) {
                        AppDbManager.unload(namespace);
                        appDataPurger.purga(namespace, null);
                        if (!removed.includes(namespace)) removed.push(namespace);
                    }
                }
            }
        }

        if (removed.length > 0) {
            bus.publish('store:reconciled', { removed });
            try {
                recordDistributedAuditLog('reconciler', 'RECONCILED_APPS_PURGED', 'multiple', { removed, timestamp: Math.floor(Date.now() / 1000) });
            } catch (_) {}
            try {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) {
                        w.webContents.send('sync-updated', { table: 'installed_apps' });
                    }
                });
            } catch (_) {}
        }

        return { reconciled: removed.length, removed };
    } catch (e) {
        return { reconciled: 0, removed: [] };
    }
}

module.exports = {
    handleRemoteAppUninstall,
    handleRemoteAppInstallOrUpdate,
    reconcileInstalledApps,
    recordDistributedAuditLog,
    isCoreApp
};
