'use strict';

const { getDB, saveDB, wrapMutationWithEvent } = require('../db');
const accessGuard = require('../core/access_guard');
const sessionManager = require('../core/session_manager');
const appsRegistry = require('../core/appsRegistry');
const AppLoader = require('../core/AppLoader');
const DependencyResolver = require('../core/DependencyResolver');
const AppUpdateManager = require('../core/AppUpdateManager');
const appPackageFetcher = require('../core/appPackageFetcher');
const appDataPurger = require('../core/appDataPurger');
const appVersionArchive = require('../core/appVersionArchive');
const clusterAppLifecycle = require('../core/clusterAppLifecycle');
const clusterAppRollback = require('../core/clusterAppRollback');
const clusterStateDriftDetector = require('../core/clusterStateDriftDetector');
const path = require('path');
const fs = require('fs');

const {
    listRepositories,
    addRepository,
    removeRepository,
    setRepositoryEnabled,
    getStoreDB,
    getTimestamp
} = require('./store_repositories');

const {
    getAvailable,
    getInstalled,
    getCoreApps,
    checkUpdates,
    preloadMarketplaceCache,
    syncNetworkApps,
    getInstalledRows,
    clearMarketplaceCache,
    getClusterAppMatrix
} = require('./store_marketplace');

function logInstallAction(db, appId, action, version, actorUserId, success, error) {
    try {
        if (!db) return;
        db.run(
            'INSERT INTO app_install_log (app_id, action, version, actor_user_id, timestamp, success, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [appId, action, version || null, actorUserId || null, getTimestamp(), success ? 1 : 0, error || null]
        );
    } catch (_) {}
}

async function downloadAndExtractStaged(appId, targetManifest, versioneRichiesta) {
    try {
        const db = getStoreDB();
        if (versioneRichiesta) {
            const archiviata = appVersionArchive.leggi(db, appId, versioneRichiesta);
            if (!archiviata) {
                throw new Error('Pacchetto non presente in archivio');
            }
            return appPackageFetcher.daBuffer(appId, archiviata.buffer, versioneRichiesta);
        }
        const esito = await appPackageFetcher.acquisisci(appId, targetManifest);
        if (esito && esito.buffer) {
            try {
                appVersionArchive.conserva(db, appId, targetManifest ? targetManifest.version : null, esito.buffer);
            } catch (_) {}
        }
        return esito;
    } catch (e) {
        throw e;
    }
}

async function install(event, appId, versioneRichiesta) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        if (!appId) return { success: false, error: 'appId mancante' };

        const availableRes = await getAvailable();
        const availableApps = availableRes.success ? availableRes.data : [];
        const nomeDi = id => (availableApps.find(m => m.id === id) || {}).name || id;

        if (versioneRichiesta) {
            return installaSingola(appId, versioneRichiesta, availableApps);
        }

        const installateRighe = await getInstalledRows();
        const piano = DependencyResolver.pianificaInstallazione(
            appId,
            availableApps,
            installateRighe.map(riga => ({ id: riga.app_id, version: riga.version }))
        );
        if (!piano.ok) {
            return {
                success: false,
                error: 'Installazione non possibile: ' + DependencyResolver.descriviProblemi(piano, nomeDi),
                data: { piano }
            };
        }

        const installate = [];
        for (const id of piano.ordine) {
            const esito = await installaSingola(id, null, availableApps);
            if (!esito.success) {
                return {
                    success: false,
                    error: id === appId ? esito.error : `Installazione della dipendenza "${nomeDi(id)}" non riuscita: ${esito.error}`,
                    data: { installed: installate }
                };
            }
            installate.push(id);
        }
        return { success: true, data: { installed: installate, dipendenze: installate.filter(id => id !== appId) } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function installaSingola(appId, versioneRichiesta, availableApps) {
    let lockAcquired = false;
    let previousVersion = null;
    let createdStagingDir = null;
    try {
        if (AppUpdateManager.isLocked(appId)) {
            return { success: false, error: 'Applicazione già in aggiornamento' };
        }

        let targetManifest = availableApps.find(m => m.id === appId);

        if (!targetManifest) {
            return { success: false, error: 'App "' + appId + '" non trovata nel Marketplace' };
        }

        if (targetManifest.core) {
            return { success: false, error: 'Le applicazioni predefinite non possono essere installate.' };
        }

        const installedRowsBefore = await getInstalledRows();
        const previousRow = installedRowsBefore.find(r => r.app_id === appId);
        previousVersion = previousRow ? previousRow.version : null;

        if (previousVersion) {
            try {
                clusterAppRollback.createAppDatabaseSnapshot(appId, previousVersion);
            } catch (_) {}
        }

        AppUpdateManager.beginManualOperation(appId, targetManifest.downloadUrl ? 'downloading' : 'installevalue', {
            currentVersion: previousVersion,
            availableVersion: targetManifest.version
        });
        lockAcquired = true;

        const { stagingDir } = await downloadAndExtractStaged(appId, targetManifest, versioneRichiesta);
        createdStagingDir = stagingDir;

        AppUpdateManager.beginManualOperation(appId, 'installing', {
            currentVersion: previousVersion,
            availableVersion: targetManifest.version
        });

        const { app, session } = require('electron');
        const targetFolder = targetManifest.folder || appId;
        const targetBaseDir = path.join(app.getPath('userData'), 'installed_apps');
        const finalAppDir = path.join(targetBaseDir, targetFolder);

        await AppLoader.unloadApp(appId);

        Object.keys(require.cache).forEach(key => {
            if (key.startsWith(finalAppDir) || key.includes(appId) || (targetManifest.folder && key.includes(targetManifest.folder))) {
                delete require.cache[key];
            }
        });

        try {
            const updatePolicy = require('../core/updatePolicy');
            if (updatePolicy.pulisciCacheDopoAggiornamento() && session && session.defaultSession) {
                await session.defaultSession.clearCache();
                await session.defaultSession.clearStorageData({ storages: ['cachestorage'] });
            }
        } catch (_) {}

        if (fs.existsSync(finalAppDir)) {
            fs.rmSync(finalAppDir, { recursive: true, force: true });
        }
        fs.mkdirSync(path.dirname(finalAppDir), { recursive: true });
        fs.renameSync(stagingDir, finalAppDir);
        createdStagingDir = null;

        appPackageFetcher.pulisciStagingResidui();

        const updatedManifests = await appsRegistry.getAppsRegistry();
        const manifest = updatedManifests.find(m => m.id === appId) || targetManifest;
        const ok = await AppLoader.loadApp(manifest);
        if (!ok) {
            throw new Error('Inizializzazione fallita per l\'applicazione "' + appId + '"');
        }

        const db = getStoreDB();
        const actorUserId = sessionManager.getCurrentUserId();
        const ts = getTimestamp();
        if (db) {
            const existing = db.query('SELECT app_id FROM installed_apps WHERE app_id = ?', [appId]);
            if (existing && existing.length > 0) {
                db.run('UPDATE installed_apps SET version = ?, updated_at = ?, status = ?, is_deleted = 0, last_modified = ? WHERE app_id = ?', [manifest.version || '0.0.0', ts, 'active', ts, appId]);
            } else {
                db.run(
                    'INSERT INTO installed_apps (app_id, version, installed_at, updated_at, published_at, installed_by, status, is_deleted, last_modified) VALUES(?, ?, ?, ?, ?, ?, ?, 0, ?)',
                    [appId, manifest.version || '0.0.0', ts, ts, manifest.published_at || null, actorUserId, 'active', ts]
                );
            }
            logInstallAction(db, appId, 'install', manifest.version, actorUserId, true, null);
            await saveDB('store');
        }

        try {
            wrapMutationWithEvent('INSERT', 'installed_apps', appId, {
                app_id: appId,
                version: manifest.version || 'v1.0.0',
                installed_at: ts,
                updated_at: ts,
                status: 'active',
                is_deleted: 0,
                last_modified: ts
            });
        } catch (_) {}

        try {
            clusterAppLifecycle.recordDistributedAuditLog(actorUserId, 'APP_INSTALLED', appId, { version: manifest.version, actorUserId, timestamp: ts });
        } catch (_) {}

        try {
            require('./rbac').syncPermissionsFromManifests();
        } catch (_) {}

        AppUpdateManager.annunciaAggiornamento(appId, manifest.version || targetManifest.version);

        AppUpdateManager.endManualOperation(appId, {
            finalState: 'done',
            notifyUpdated: true,
            previousVersion,
            newVersion: targetManifest.version,
            clearDelayMs: 4000
        });
        lockAcquired = false;

        return { success: true, data: { installed: [appId] } };
    } catch (e) {
        if (createdStagingDir && fs.existsSync(createdStagingDir)) {
            try { fs.rmSync(createdStagingDir, { recursive: true, force: true }); } catch (_) {}
        }
        if (lockAcquired) {
            AppUpdateManager.endManualOperation(appId, {
                finalState: 'error',
                meta: { error: e.message },
                clearDelayMs: 8000
            });
        }
        return { success: false, error: e.message };
    }
}

async function anteprimaDisinstallazione(event, appId) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        if (!appId) return { success: false, error: 'appId mancante' };
        const manifests = await appsRegistry.getAppsRegistry();
        const targetManifest = manifests.find(m => m.id === appId);
        if (targetManifest && targetManifest.core) {
            return { success: false, error: 'Le applicazioni predefinite non possono essere disinstallate.' };
        }
        const installate = await getInstalledRows();
        if (!installate.some(r => r.app_id === appId)) {
            return { success: false, error: 'Applicazione non installata su questo nodo' };
        }
        const stima = appDataPurger.anteprima(appId, targetManifest);
        return { success: true, data: { voci: stima.voci, quante: stima.quante, archivio: stima.dominio } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function uninstall(event, appId) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        if (!appId) return { success: false, error: 'appId mancante' };

        if (AppUpdateManager.isLocked(appId)) {
            return { success: false, error: 'Applicazione in aggiornamento. Attendi il completamento.' };
        }

        const manifests = await appsRegistry.getAppsRegistry();
        const targetManifest = manifests.find(m => m.id === appId);

        if (targetManifest && targetManifest.core) {
            return { success: false, error: 'Le applicazioni predefinite non possono essere disinstallate.' };
        }

        const installedRows = await getInstalledRows();
        const installedIds = installedRows.map(r => r.app_id);
        const { canUninstall, blockedBy } = DependencyResolver.canUninstall(appId, installedIds, manifests);

        if (!canUninstall) {
            return {
                success: false,
                error: 'Impossibile disinstallare: richiesta da ' + blockedBy.join(', '),
                blockedBy
            };
        }

        const ts = getTimestamp();
        try {
            wrapMutationWithEvent('DELETE', 'installed_apps', appId, {
                app_id: appId,
                version: targetManifest ? targetManifest.version : '1.0.0',
                status: 'uninstalled',
                is_deleted: 1,
                last_modified: ts
            });
        } catch (_) {}

        const esitoRimozione = await clusterAppLifecycle.handleRemoteAppUninstall(appId);
        const purga = esitoRimozione && typeof esitoRimozione === 'object' ? esitoRimozione : null;

        const db = getStoreDB();
        const actorUserId = sessionManager.getCurrentUserId();

        if (db) {
            db.run('DELETE FROM installed_apps WHERE app_id = ?', [appId]);
            db.run('DELETE FROM app_dependencies WHERE app_id = ?', [appId]);
            db.run('DELETE FROM app_versioni WHERE app_id = ?', [appId]);
        }

        try {
            appVersionArchive.rimuoviTutte(db, appId);
        } catch (_) {}

        logInstallAction(db, appId, 'uninstall', targetManifest ? targetManifest.version : null, actorUserId, true, null);
        if (db) await saveDB('store');

        clearMarketplaceCache();

        return {
            success: true,
            data: {
                rimossi: purga ? purga.rimossi : 0,
                completo: purga ? purga.completo : false,
                falliti: purga ? purga.falliti : [{ etichetta: 'Generale', errore: 'Esito della rimozione non disponibile' }]
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function elencaVersioni(event, appId) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        if (!appId) return { success: false, error: 'appId mancante' };
        const db = getStoreDB();
        const righe = appVersionArchive.elenca(db, appId);
        const installate = await getInstalledRows();
        const corrente = installate.find(r => r.app_id === appId);
        const snapshots = clusterAppRollback.listAppSnapshots(appId);

        return {
            success: true,
            data: {
                conservate: appVersionArchive.CONSERVATE,
                installata: corrente ? corrente.version : null,
                snapshots,
                versioni: righe.map(riga => ({
                    version: riga.version,
                    dimensione: riga.dimensione,
                    sha256: riga.sha256,
                    scaricato_il: riga.scaricato_il,
                    attuale: Boolean(corrente && String(corrente.version) === String(riga.version)),
                    hasSnapshot: snapshots.some(s => s.version === riga.version)
                }))
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function installaVersione(event, args) {
    try {
        const appId = args && args.appId;
        const versione = args && args.versione;
        if (!appId || !versione) return { success: false, error: 'appId e versione sono obbligatori' };
        const installate = await getInstalledRows();
        if (!installate.some(r => r.app_id === appId)) {
            return { success: false, error: 'Applicazione non installata' };
        }
        return install(event, appId, versione);
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function rollbackAppVersion(event, args) {
    try {
        const appId = args && args.appId;
        const targetVersion = args && args.targetVersion;
        return clusterAppRollback.rollbackAppVersion(event, appId, targetVersion);
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function checkClusterHealth() {
    try {
        return clusterStateDriftDetector.checkClusterStateDrift();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getSystemLogs() {
    try {
        const db = getStoreDB();
        if (!db) return [];
        return db.query('SELECT * FROM app_install_log ORDER BY timestamp DESC LIMIT 200', []);
    } catch (_) {
        return [];
    }
}

async function clearSystemLogs() {
    try {
        const db = getStoreDB();
        if (db) {
            db.run('DELETE FROM app_install_log');
            await saveDB('store');
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deleteSystemLog(id) {
    try {
        const db = getStoreDB();
        if (db) {
            db.run('DELETE FROM app_install_log WHERE id = ?', [id]);
            await saveDB('store');
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    elencaVersioni,
    installaVersione,
    anteprimaDisinstallazione,
    getAvailable,
    getInstalled,
    getCoreApps,
    install,
    uninstall,
    rollbackAppVersion,
    checkClusterHealth,
    getClusterAppMatrix,
    checkUpdates,
    getSystemLogs,
    clearSystemLogs,
    deleteSystemLog,
    syncNetworkApps,
    preloadMarketplaceCache,
    listRepositories,
    addRepository,
    removeRepository,
    setRepositoryEnabled
};
