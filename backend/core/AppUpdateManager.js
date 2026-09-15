'use strict';

const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const auditLogger = require('../observability/auditLogger');
const appPackageFetcher = require('./appPackageFetcher');
const updatePolicy = require('./updatePolicy');

const STATES = {
    IDLE: 'idle',
    CHECKING: 'checking',
    PENDING: 'pending',
    DOWNLOADING: 'downloading',
    INSTALLING: 'installing',
    ROLLING_BACK: 'rolling_back',
    DONE: 'done',
    ERROR: 'error'
};

const INITIAL_DELAY_MS = 15000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 5000;
const MEMORIA_ANNUNCI_MS = 10 * 60 * 1000;

class AppUpdateManager {
    constructor() {
        try {
            this._locked = new Map();
            this._queue = [];
            this._processing = false;
            this._intervalId = null;
            this._avviato = false;
            this._annunciVisti = new Map();
            this._status = {
                lastCheck: null,
                state: STATES.IDLE,
                queue: []
            };
        } catch (e) {}
    }

    _broadcast(event, payload) {
        try {
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                try {
                    if (!win.isDestroyed()) {
                        win.webContents.send(event, payload);
                    }
                } catch (e) {}
            });
        } catch (e) {}
    }

    _setLock(appId, state, meta = {}) {
        try {
            this._locked.set(appId, { state, ...meta, ts: Date.now() });
            this._updateQueueStatus();
            this._broadcast('store:app-update-event', {
                appId,
                state,
                ...meta,
                ts: Date.now()
            });
        } catch (e) {}
    }

    _clearLock(appId) {
        try {
            this._locked.delete(appId);
            this._updateQueueStatus();
        } catch (e) {}
    }

    isLocked(appId) {
        try {
            const entry = this._locked.get(appId);
            if (!entry) return false;
            return [STATES.DOWNLOADING, STATES.INSTALLING, STATES.ROLLING_BACK].includes(entry.state);
        } catch (e) {
            return false;
        }
    }

    getAppState(appId) {
        try {
            return this._locked.get(appId) || { state: STATES.IDLE };
        } catch (e) {
            return { state: STATES.IDLE };
        }
    }

    getQueueStatus() {
        try {
            return {
                ...this._status,
                queue: Array.from(this._locked.entries()).map(([appId, info]) => ({
                    appId,
                    ...info
                }))
            };
        } catch (e) {
            return { state: STATES.IDLE, queue: [] };
        }
    }

    _updateQueueStatus() {
        try {
            this._status.queue = Array.from(this._locked.entries()).map(([appId, info]) => ({
                appId,
                ...info
            }));
            this._broadcast('store:update-queue-changed', this.getQueueStatus());
        } catch (e) {}
    }

    async startBackgroundCheck() {
        try {
            if (this._avviato) return;
            this._avviato = true;

            updatePolicy.osservaCambiamenti(() => {
                try { this._riprogramma(); } catch (e) {}
            });

            setTimeout(() => {
                try { this._runCheck(); } catch (e) {}
            }, INITIAL_DELAY_MS);

            this._riprogramma();
        } catch (e) {}
    }

    _riprogramma() {
        try {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            if (!updatePolicy.appsAutoCheckAttivo()) return;
            const attesa = updatePolicy.appsIntervalloMs();
            this._intervalId = setInterval(() => {
                try { this._runCheck(); } catch (e) {}
            }, attesa);
        } catch (e) {}
    }

    async _runCheck(isManual = false) {
        try {
            if (!isManual && !updatePolicy.appsAutoCheckAttivo()) return;

            if (this._status.state === STATES.CHECKING) return;
            this._status.state = STATES.CHECKING;
            this._status.lastCheck = Date.now();
            this._broadcast('store:update-queue-changed', this.getQueueStatus());

            const storeHandlers = require('../handlers/store');
            const result = await storeHandlers.checkUpdates();

            if (!result || !result.success || !Array.isArray(result.data) || result.data.length === 0) {
                this._status.state = STATES.IDLE;
                this._broadcast('store:update-queue-changed', this.getQueueStatus());
                return;
            }

            const isAutoMode = updatePolicy.appsInstallazioneAutomatica();

            const toUpdate = result.data.filter(u => !this.isLocked(u.appId) && u.currentVersion && u.availableVersion && u.currentVersion !== u.availableVersion);
            toUpdate.forEach(u => {
                try {
                    const alreadyQueued = this._queue.find(q => q.appId === u.appId);
                    if (!alreadyQueued) {
                        this._queue.push(u);
                        this._setLock(u.appId, STATES.PENDING, {
                            currentVersion: u.currentVersion,
                            availableVersion: u.availableVersion
                        });
                    }
                } catch (e) {}
            });

            this._status.state = STATES.IDLE;
            if (isAutoMode) {
                this._processQueue();
            } else {
                this._updateQueueStatus();
            }
        } catch (e) {
            this._status.state = STATES.IDLE;
        }
    }

    async _processQueue() {
        try {
            if (this._processing || this._queue.length === 0) return;
            this._processing = true;

            while (this._queue.length > 0) {
                const item = this._queue.shift();
                try {
                    await this._updateApp(item);
                } catch (e) {
                    this._setLock(item.appId, STATES.ERROR, {
                        error: e.message,
                        currentVersion: item.currentVersion,
                        availableVersion: item.availableVersion
                    });
                    setTimeout(() => { try { this._clearLock(item.appId); } catch (e2) {} }, 10000);
                }
            }
            this._processing = false;
        } catch (e) {
            this._processing = false;
        }
    }

    async _backupAppFolder(appDir, appId) {
        try {
            if (!fs.existsSync(appDir)) return null;
            const backupsDir = path.join(app.getPath('userData'), 'app_backups', appId, String(Date.now()));
            await fs.promises.mkdir(backupsDir, { recursive: true });
            await fs.promises.cp(appDir, backupsDir, { recursive: true });
            return backupsDir;
        } catch (e) {
            return null;
        }
    }

    async rollbackApp(appId) {
        try {
            this._setLock(appId, STATES.ROLLING_BACK);
            const userAppsPath = path.join(app.getPath('userData'), 'installed_apps');
            const appDir = path.join(userAppsPath, appId);
            const backupsBase = path.join(app.getPath('userData'), 'app_backups', appId);
            
            if (!fs.existsSync(backupsBase)) {
                throw new Error('Nessun backup trovato per il rollback');
            }

            const backups = fs.readdirSync(backupsBase).sort().reverse();
            if (backups.length === 0) {
                throw new Error('Nessun backup disponibile');
            }

            const latestBackup = path.join(backupsBase, backups[0]);
            
            if (fs.existsSync(appDir)) {
                fs.rmSync(appDir, { recursive: true, force: true });
            }

            fs.mkdirSync(appDir, { recursive: true });
            const copyDirRecursive = (src, dest) => {
                try {
                    const files = fs.readdirSync(src);
                    for (const file of files) {
                        const srcFile = path.join(src, file);
                        const destFile = path.join(dest, file);
                        const stat = fs.statSync(srcFile);
                        if (stat.isDirectory()) {
                            fs.mkdirSync(destFile, { recursive: true });
                            copyDirRecursive(srcFile, destFile);
                        } else {
                            fs.copyFileSync(srcFile, destFile);
                        }
                    }
                } catch (eCopy) {}
            };
            copyDirRecursive(latestBackup, appDir);

            const AppLoader = require('./AppLoader');
            AppLoader.unloadApp(appId);
            const manifests = require('./appsRegistry');
            const allApps = await manifests.getAppsRegistry();
            const manifest = allApps.find(m => m.id === appId || m.folder === appId);
            if (manifest) await AppLoader.loadApp(manifest);

            auditLogger.logEvent('system', 'APP_ROLLBACK', 'app', appId, { backupUsed: backups[0] });
            this._setLock(appId, STATES.DONE, { rollback: true });
            setTimeout(() => { try { this._clearLock(appId); } catch (e) {} }, 5000);
            return { success: true };
        } catch (e) {
            this._setLock(appId, STATES.ERROR, { error: e.message });
            setTimeout(() => { try { this._clearLock(appId); } catch (e2) {} }, 5000);
            return { success: false, error: e.message };
        }
    }

    async _updateApp(item, attempt = 1) {
        try {
            const { appId, availableVersion, currentVersion } = item;

            this._setLock(appId, STATES.DOWNLOADING, {
                currentVersion,
                availableVersion,
                attempt
            });

            const storeHandlers = require('../handlers/store');
            const availableRes = await storeHandlers.getAvailable();
            if (!availableRes || !availableRes.success) {
                throw new Error('Impossibile recuperare lista app disponibili');
            }

            const targetApp = availableRes.data.find(a => a.id === appId);
            if (!targetApp) throw new Error(`App ${appId} non trovata nel marketplace`);
            if (!targetApp.downloadUrl) throw new Error(`URL download assente per ${appId}`);

            const { confrontaVersioni } = require('./manifest/manifest_v2');
            if (targetApp.minCoreVersion && confrontaVersioni(targetApp.minCoreVersion, app.getVersion()) > 0) {
                throw new Error(`Incompatibile: richiede Koradest Core >= ${targetApp.minCoreVersion}`);
            }

            const userAppsPath = path.join(app.getPath('userData'), 'installed_apps');
            const appDir = path.join(userAppsPath, targetApp.folder || appId);

            const { stagingDir } = await appPackageFetcher.acquisisci(appId, targetApp);

            this._setLock(appId, STATES.INSTALLING, {
                currentVersion,
                availableVersion
            });

            await this._backupAppFolder(appDir, appId);

            const AppLoader = require('./AppLoader');
            await AppLoader.unloadApp(appId);

            Object.keys(require.cache).forEach(key => {
                if (key.startsWith(appDir) || key.includes(appId) || (targetApp.folder && key.includes(targetApp.folder))) {
                    delete require.cache[key];
                }
            });

            if (fs.existsSync(appDir)) {
                fs.rmSync(appDir, { recursive: true, force: true });
            }
            await fs.promises.mkdir(path.dirname(appDir), { recursive: true });
            fs.renameSync(stagingDir, appDir);

            try {
                const { session } = require('electron');
                if (session && session.defaultSession) {
                    await session.defaultSession.clearCache();
                    await session.defaultSession.clearStorageData({ storages: ['cachestorage', 'shadercache', 'serviceworkers'] });
                    if (typeof session.defaultSession.clearCodeCaches === 'function') {
                        await session.defaultSession.clearCodeCaches({});
                    }
                }
            } catch (eCache) {}

            const { getDB, saveDB } = require('../db');
            const db = getDB('store');
            if (db) {
                const existing = db.query('SELECT * FROM installed_apps WHERE app_id = ?', [appId]);
                if (existing && existing.length > 0) {
                    db.run('UPDATE installed_apps SET version = ? WHERE app_id = ?', [availableVersion, appId]);
                } else {
                    db.run(
                        "INSERT INTO installed_apps (app_id, version, installed_at, status) VALUES (?, ?, ?, 'active')",
                        [appId, availableVersion, Math.floor(Date.now() / 1000)]
                    );
                }
                await saveDB('store');
            }

            try {
                const manifests = require('./appsRegistry');
                const allApps = await manifests.getAppsRegistry();
                const manifest = allApps.find(m => m.id === appId || m.folder === appId) || targetApp;
                if (manifest) await AppLoader.loadApp(manifest);
            } catch (reloadErr) {}

            try {
                require('../handlers/rbac').syncPermissionsFromManifests();
            } catch (rbacErr) {}

            auditLogger.logEvent('system', 'APP_UPDATE', 'app', appId, { previousVersion: currentVersion, newVersion: availableVersion });

            this.annunciaAggiornamento(appId, availableVersion);

            this._clearLock(appId);

            this._broadcast('store:app-updated', {
                appId,
                previousVersion: currentVersion,
                newVersion: availableVersion
            });

        } catch (e) {
            if (attempt < MAX_RETRIES) {
                const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
                this._setLock(item.appId, STATES.PENDING, {
                    currentVersion: item.currentVersion,
                    availableVersion: item.availableVersion,
                    retryIn: backoff,
                    attempt
                });
                await new Promise(resolve => setTimeout(resolve, backoff));
                await this._updateApp(item, attempt + 1);
            } else {
                throw e;
            }
        }
    }

    _giaVisto(chiave) {
        try {
            const adesso = Date.now();
            for (const [k, quando] of this._annunciVisti.entries()) {
                if (adesso - quando > MEMORIA_ANNUNCI_MS) this._annunciVisti.delete(k);
            }
            if (this._annunciVisti.has(chiave)) return true;
            this._annunciVisti.set(chiave, adesso);
            return false;
        } catch (e) {
            return false;
        }
    }

    _versioneInstallata(appId) {
        try {
            const { getDB } = require('../db');
            const db = getDB('store');
            if (!db) return null;
            const righe = db.query('SELECT version FROM installed_apps WHERE app_id = ? AND status = ?', [appId, 'active']);
            return righe && righe.length > 0 ? righe[0].version : null;
        } catch (e) {
            return null;
        }
    }

    annunciaAggiornamento(appId, version) {
        try {
            if (!appId || !version) return false;
            if (this._giaVisto(`out:${appId}@${version}`)) return false;
            const p2p = require('../p2p/index');
            if (typeof p2p.announceAppUpdate !== 'function') return false;
            return p2p.announceAppUpdate(appId, version);
        } catch (e) {
            return false;
        }
    }

    controlloDaRete(appId, version, senderIp) {
        try {
            if (!appId || !version) return false;
            if (!updatePolicy.appsAutoCheckAttivo()) return false;
            if (this.isLocked(appId)) return false;
            if (this._giaVisto(`in:${appId}@${version}`)) return false;

            const installata = this._versioneInstallata(appId);
            if (!installata) return false;
            if (String(installata) === String(version)) return false;

            console.log(`[Store] ${senderIp || 'un nodo'} segnala ${appId} v${version} (qui v${installata}): verifica immediata.`);
            this._runCheck(false);
            return true;
        } catch (e) {
            return false;
        }
    }

    forceCheckNow() {
        try {
            this._runCheck(true);
        } catch (e) {}
    }

    beginManualOperation(appId, state, meta = {}) {
        try {
            this._setLock(appId, state, meta);
        } catch (e) {}
    }

    endManualOperation(appId, opts = {}) {
        try {
            if (opts.finalState) {
                this._setLock(appId, opts.finalState, opts.meta || {});
            }
            if (opts.notifyUpdated) {
                this._broadcast('store:app-updated', {
                    appId,
                    previousVersion: opts.previousVersion,
                    newVersion: opts.newVersion
                });
            }
            const clearDelayMs = typeof opts.clearDelayMs === 'number' ? opts.clearDelayMs : 0;
            if (clearDelayMs > 0) {
                setTimeout(() => { try { this._clearLock(appId); } catch (e2) {} }, clearDelayMs);
            } else {
                this._clearLock(appId);
            }
        } catch (e) {}
    }
}

const instance = new AppUpdateManager();
module.exports = instance;
