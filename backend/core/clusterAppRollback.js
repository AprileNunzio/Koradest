'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const dbManager = require('../db/db_manager');
const AppLoader = require('./AppLoader');
const AppDbManager = require('./AppDbManager');
const appDataPurger = require('./appDataPurger');
const appVersionArchive = require('./appVersionArchive');
const appPackageFetcher = require('./appPackageFetcher');
const clusterAppLifecycle = require('./clusterAppLifecycle');
const accessGuard = require('./access_guard');
const sessionManager = require('./session_manager');
const { wrapMutationWithEvent } = require('../db');

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

function getSnapshotsDir() {
    try {
        dbManager.initPaths();
        const dir = path.join(dbManager.basePath || radiceUtente(), 'snapshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return dir;
    } catch (_) {
        return null;
    }
}

function createAppDatabaseSnapshot(appId, currentVersion) {
    try {
        if (!appId || !currentVersion) return false;
        const info = appDataPurger.risolviInformazioniApp(appId);
        const dbFile = path.join(dbManager.basePath || '', info.dominio + '.enc');
        if (!fs.existsSync(dbFile)) return false;

        const snapDir = getSnapshotsDir();
        if (!snapDir) return false;

        const snapFile = path.join(snapDir, info.dominio + '.snapshot.v' + currentVersion + '.enc');
        fs.copyFileSync(dbFile, snapFile);
        return true;
    } catch (_) {
        return false;
    }
}

function listAppSnapshots(appId) {
    try {
        const snapDir = getSnapshotsDir();
        if (!snapDir || !fs.existsSync(snapDir)) return [];
        const info = appDataPurger.risolviInformazioniApp(appId);
        const prefix = info.dominio + '.snapshot.v';

        return fs.readdirSync(snapDir)
            .filter(f => f.startsWith(prefix) && f.endsWith('.enc'))
            .map(f => {
                const ver = f.replace(prefix, '').replace(/\.enc$/, '');
                const stat = fs.statSync(path.join(snapDir, f));
                return {
                    version: ver,
                    file: f,
                    size: stat.size,
                    createdAt: stat.mtimeMs
                };
            });
    } catch (_) {
        return [];
    }
}

async function rollbackAppVersion(event, appId, targetVersion) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        if (!appId || !targetVersion) return { success: false, error: 'appId e targetVersion obbligatori' };

        const db = getStoreDB();
        if (!db) return { success: false, error: 'Database Store non disponibile' };

        const archived = appVersionArchive.leggi(db, appId, targetVersion);
        if (!archived || !archived.buffer) {
            return { success: false, error: 'Archivio versione v' + targetVersion + ' non presente in archivio locale' };
        }

        const info = appDataPurger.risolviInformazioniApp(appId);
        await AppLoader.unloadApp(appId);
        if (info.namespace) AppDbManager.unload(info.namespace);

        const { stagingDir } = await appPackageFetcher.daBuffer(appId, archived.buffer, targetVersion);
        const finalAppDir = path.join(radiceUtente(), 'installed_apps', info.folder);

        if (fs.existsSync(finalAppDir)) {
            fs.rmSync(finalAppDir, { recursive: true, force: true });
        }
        fs.mkdirSync(path.dirname(finalAppDir), { recursive: true });
        fs.renameSync(stagingDir, finalAppDir);

        const snapDir = getSnapshotsDir();
        if (snapDir) {
            const snapFile = path.join(snapDir, info.dominio + '.snapshot.v' + targetVersion + '.enc');
            const targetDbFile = path.join(dbManager.basePath || '', info.dominio + '.enc');
            if (fs.existsSync(snapFile)) {
                fs.copyFileSync(snapFile, targetDbFile);
            }
        }

        const ts = Math.floor(Date.now() / 1000);
        db.run(
            "UPDATE installed_apps SET version = ?, updated_at = ?, status = 'active', is_deleted = 0, last_modified = ? WHERE app_id = ?",
            [targetVersion, ts, ts, appId]
        );
        await dbManager.saveDatabase('store');

        try {
            wrapMutationWithEvent('UPDATE', 'installed_apps', appId, {
                app_id: appId,
                version: targetVersion,
                updated_at: ts,
                status: 'active',
                is_deleted: 0,
                last_modified: ts
            });
        } catch (_) {}

        const actorUserId = sessionManager.getCurrentUserId();
        try {
            clusterAppLifecycle.recordDistributedAuditLog(actorUserId, 'APP_ROLLBACK', appId, { targetVersion, timestamp: ts });
        } catch (_) {}

        const mPath = path.join(finalAppDir, 'manifest.json');
        let newManifest = null;
        if (fs.existsSync(mPath)) {
            try { newManifest = JSON.parse(fs.readFileSync(mPath, 'utf8')); } catch (_) {}
        }
        if (newManifest) await AppLoader.loadApp(newManifest);

        return { success: true, data: { appId, rolledBackTo: targetVersion } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    createAppDatabaseSnapshot,
    listAppSnapshots,
    rollbackAppVersion
};
