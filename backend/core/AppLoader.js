'use strict';

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const AppDbManager = require('./AppDbManager');
const appProcessManager = require('./appProcessManager');
const licenseManager = require('../security/licenseManager');
const capabilityBroker = require('../security/capabilityBroker');
const cryptoVerifier = require('../security/cryptoVerifier');
const auditLogger = require('../observability/auditLogger');
const kernel = require('./kernel');
const kernelModules = require('./kernel/kernel_modules');

const _loaded = new Map();
const APPS_PATH = path.join(__dirname, '../../src/apps');

function tabelleLocaliDi(manifest) {
    try {
        const dichiarate = manifest && manifest.db && manifest.db.local_tables;
        if (!Array.isArray(dichiarate)) return [];
        return dichiarate
            .filter(nome => typeof nome === 'string' && nome.length > 0)
            .map(nome => nome.toLowerCase());
    } catch (e) {
        return [];
    }
}

function creaReplicatore(manifest) {
    const locali = tabelleLocaliDi(manifest);
    const dominio = manifest && manifest.db && manifest.db.namespace ? `app_${manifest.db.namespace}` : null;

    return function replica(eventType, tableName, recordId, payload) {
        try {
            if (!dominio || !tableName || !recordId) return false;
            if (locali.indexOf(String(tableName).toLowerCase()) !== -1) return false;

            const schemaRegistry = require('../dag/schema/schema_registry');
            if (!schemaRegistry.isTableSyncable(tableName)) return false;
            if (schemaRegistry.getDomainForTable(tableName) !== dominio) return false;

            const { wrapMutationWithEvent } = require('../db');
            wrapMutationWithEvent(eventType, tableName, recordId, payload || {});
            return true;
        } catch (e) {
            return false;
        }
    };
}

function pubblicaStrumentiAI(manifest, runtime) {
    const { toolRegistry } = require('../ai/ollama');
    const { definizioni } = require('../ai/gateway/strumenti_runtime');
    const pubblicati = toolRegistry.registerTools(manifest.id, definizioni({
        appId: manifest.id,
        nomeApp: manifest.name || manifest.id,
        descrizioneApp: manifest.description || null,
        azioni: runtime.descriviAzioni(),
        ruoliPredefiniti: runtime.ruoliPredefiniti
    }));
    console.log(`[AppLoader] ${manifest.id}: ${pubblicati} strumenti AI disponibili`);
}

function pubblicaStrumentiSenzaContratto(manifest, nomiAzioni) {
    const { toolRegistry } = require('../ai/ollama');
    const { definizioniSenzaContratto } = require('../ai/gateway/strumenti_runtime');
    const pubblicati = toolRegistry.registerTools(manifest.id, definizioniSenzaContratto({
        appId: manifest.id,
        nomeApp: manifest.name || manifest.id,
        descrizioneApp: manifest.description || null,
        nomiAzioni
    }));
    console.log(`[AppLoader] ${manifest.id}: ${pubblicati} strumenti AI dedotti dalle azioni senza contratto`);
}

function permessiDi(manifest) {
    if (Array.isArray(manifest.permissions)) return manifest.permissions;
    return manifest.core === true ? ['*'] : [];
}

function aliasesOf(manifest) {
    try {
        if (!manifest) return [];
        return Array.from(new Set([
            manifest.id,
            manifest.folder,
            manifest.ipc && manifest.ipc.namespace
        ].filter(Boolean)));
    } catch (e) {
        return [];
    }
}

async function loadApp(manifest) {
    try {
        if (manifest && manifest.manifestVersion === 2 && !manifest.db && manifest.data) {
            const manifestV2 = require('./manifest/manifest_v2');
            manifest = manifestV2.normalizza(manifest);
        }
        const appId = manifest.id;

        if (_loaded.has(appId)) {
            return true;
        }

        const userDataPath = app && typeof app.getPath === 'function' ? app.getPath('userData') : '';
        const safeMode = process.env.KORADEST_SAFE_MODE === 'true' || (userDataPath && fs.existsSync(path.join(userDataPath, 'SAFE_MODE')));
        if (safeMode && !manifest.core && !manifest.bundled) {
            auditLogger.logEvent('system', 'APP_LOAD_SKIPPED_SAFE_MODE', 'app', appId);
            return false;
        }

        const currentCoreVersion = app && typeof app.getVersion === 'function' ? app.getVersion() : null;
        if (manifest.minCoreVersion && currentCoreVersion && currentCoreVersion < manifest.minCoreVersion) {
            auditLogger.logEvent('system', 'APP_LOAD_INCOMPATIBLE', 'app', appId, { minCoreVersion: manifest.minCoreVersion, currentCoreVersion });
            return false;
        }

        if (!manifest.core && !licenseManager.isModuleEnabled(appId)) {
            auditLogger.logEvent('system', 'APP_LOAD_BLOCKED_LICENSE', 'app', appId);
            return false;
        }

        const appDir = manifest.appPath || path.join(APPS_PATH, manifest.folder || appId);
        const manifestFile = path.join(appDir, 'manifest.json');

        Object.keys(require.cache).forEach(key => {
            if (key.startsWith(appDir) || (manifest.folder && key.includes(manifest.folder)) || key.includes(appId)) {
                delete require.cache[key];
            }
        });

        if (fs.existsSync(manifestFile) && manifest.integrity_hash) {
            const currentHash = cryptoVerifier.computeFileHash(manifestFile);
            if (currentHash !== manifest.integrity_hash) {
                auditLogger.logEvent('system', 'MANIFEST_INTEGRITY_TAMPERED', 'app', appId);
                return false;
            }
        }

        const dbNamespace = (manifest.db && manifest.db.namespace) || (manifest.data && (manifest.data.namespace || manifest.id));
        const dbMigrations = (manifest.db && manifest.db.migrations) || (manifest.data && manifest.data.migrations);
        if (dbNamespace) {
            try {
                let migrations = [];
                if (dbMigrations) {
                    const migPathStr = String(dbMigrations);
                    const cleanMigPath = migPathStr.startsWith('./') ? migPathStr.slice(2) : migPathStr;
                    const migrationsAbsPath = path.join(appDir, cleanMigPath);
                    if (fs.existsSync(migrationsAbsPath)) {
                        migrations = require(migrationsAbsPath);
                    }
                }
                const appDb = await AppDbManager.getOrCreate(dbNamespace, migrations);
                if (appDb) {
                    try {
                        const schemaRegistry = require('../dag/schema/schema_registry');
                        const locali = tabelleLocaliDi(manifest);
                        schemaRegistry.registerLocalTables(locali);
                        const tables = appDb.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
                        if (tables && tables.length > 0) {
                            const replicabili = tables
                                .map(t => t.name)
                                .filter(nome => locali.indexOf(String(nome).toLowerCase()) === -1)
                                .filter(nome => !String(nome).toLowerCase().startsWith('_k_'));
                            schemaRegistry.registerDynamicDomain(`app_${dbNamespace}`, replicabili);
                            if (dbNamespace === 'gestione_classi') {
                                try {
                                    const { app } = require('electron');
                                    const path = require('path');
                                    const fs = require('fs');
                                    const marker = path.join(app.getPath('userData'), 'gestione_classi_retro_sync.flag');
                                    if (!fs.existsSync(marker)) {
                                        const { wrapMutationWithEvent } = require('../db');
                                        for (const tbl of replicabili) {
                                            const rows = appDb.query(`SELECT * FROM ${tbl}`);
                                            for (const r of rows) {
                                                wrapMutationWithEvent('UPDATE', tbl, r.id, r);
                                            }
                                        }
                                        fs.writeFileSync(marker, 'sync_done');
                                    }
                                } catch (_) {}
                            }
                        }
                    } catch (_) {}
                }
            } catch (dbErr) {}
        }

        const moduliKernel = kernelModules.registra(manifest, appDir);
        if (moduliKernel.rifiutati.length > 0) {
            auditLogger.logEvent('system', 'APP_KERNEL_MODULES_REFUSED', 'app', appId, { rifiutati: moduliKernel.rifiutati });
        }

        if (manifest.manifestVersion === 2) {
            return await caricaAppV2(manifest, appDir);
        }

        const backendPath = path.join(appDir, manifest.backend || 'backend.js');

        if (fs.existsSync(backendPath)) {
            let directBackendModule = null;
            try {
                delete require.cache[require.resolve(backendPath)];
                directBackendModule = require(backendPath);
            } catch (requireErr) {}

            if (directBackendModule && typeof directBackendModule.registerBackendHandlers === 'function') {
                try {
                    const { app: electronApp } = require('electron');
                    const { getDB, saveDB } = require('../db');
                    const koradestConfig = require('../config');
                    const aliases = aliasesOf(manifest);
                    for (const a of aliases) {
                        try {
                            capabilityBroker.generateAppToken(a, permessiDi(manifest));
                        } catch (tokenErr) {}
                    }
                    const azioniRegistrate = [];
                    const registerApi = (action, fn) => {
                        azioniRegistrate.push(action);
                        try {
                            for (const a of aliases) {
                                capabilityBroker.registerApiHandler(a, action, (sourceAppId, payload) => fn(null, payload));
                            }
                        } catch (regErr) {}
                    };
                    const ok = directBackendModule.registerBackendHandlers(registerApi, electronApp, {
                        getDB, saveDB, AppDbManager,
                        readConfig: () => koradestConfig.readConfig(),
                        replica: creaReplicatore(manifest),
                        kernel: kernel.creaKernel(manifest)
                    });
                    if (ok === false) throw new Error('registerBackendHandlers ha restituito false');
                    pubblicaStrumentiSenzaContratto(manifest, azioniRegistrate);
                    for (const a of aliases) {
                        _loaded.set(a, { manifest: manifest, isProcess: false, directBackend: true });
                    }
                } catch (directErr) {
                    throw directErr;
                }
            } else {
                try {
                    const appWorkerHost = require('./appWorkerHost');
                    const spawned = appWorkerHost.startWorker(appId, manifest, backendPath);
                    if (spawned) {
                        _loaded.set(appId, { manifest: manifest, isProcess: true, isWorker: true });
                    } else {
                        const fallbackSpawned = appProcessManager.spawnAppProcess(appId, manifest, appDir);
                        if (fallbackSpawned) {
                            _loaded.set(appId, { manifest: manifest, isProcess: true });
                        } else {
                            throw new Error('Impossibile avviare il worker');
                        }
                    }
                } catch (backendErr) {
                    throw backendErr;
                }
            }
        } else {
            _loaded.set(appId, { manifest: manifest, isProcess: false });
        }
        try {
            const { toolRegistry } = require('../ai/ollama');
            if (toolRegistry && typeof toolRegistry.registerAppManifest === 'function') {
                toolRegistry.registerAppManifest(manifest);
            }
        } catch (aiErr) {
            console.warn(`[AppLoader] Strumenti AI di ${appId} non registrati:`, aiErr.message);
        }
        auditLogger.logEvent('system', 'APP_LOADED', 'app', appId, { version: manifest.version });
        return true;
    } catch (e) {
        auditLogger.logEvent('system', 'APP_LOAD_FAILED', 'app', manifest && manifest.id, { errore: e.message });
        console.error(`[AppLoader] Caricamento di ${manifest && manifest.id} non riuscito:`, e.message);
        return false;
    }
}

async function caricaAppV2(manifest, appDir) {
    const appId = manifest.id;
    const aliases = aliasesOf(manifest);
    for (const a of aliases) {
        try {
            capabilityBroker.generateAppToken(a, permessiDi(manifest));
        } catch (tokenErr) {}
    }

    if (manifest.backend) {
        const percorso = path.resolve(appDir, manifest.backend);
        if (!percorso.startsWith(path.resolve(appDir) + path.sep)) {
            throw new Error('entry.backend punta fuori dalla cartella dell\'app');
        }
        try {
            const radiceDir = path.resolve(appDir).toLowerCase() + path.sep;
            Object.keys(require.cache).forEach(chiave => {
                if (path.resolve(chiave).toLowerCase().startsWith(radiceDir)) {
                    delete require.cache[chiave];
                }
            });
            delete require.cache[percorso];
        } catch (_) {}
        const modulo = require(percorso);
        if (modulo && typeof modulo.attiva === 'function') {
            const runtime = require('./app_runtime_v2').crea(manifest, {
                kernel: kernel.creaKernel(manifest),
                replica: creaReplicatore(manifest)
            });
            await modulo.attiva(runtime.api);
            runtime.registraNelBroker(capabilityBroker, aliases);
            pubblicaStrumentiAI(manifest, runtime);
        } else if (modulo && typeof modulo.registerBackendHandlers === 'function') {
            const { app: electronApp } = require('electron');
            const { getDB, saveDB } = require('../db');
            const koradestConfig = require('../config');
            const azioniRegistrate = [];
            const registerApi = (action, fn) => {
                azioniRegistrate.push(action);
                try {
                    for (const a of aliases) {
                        capabilityBroker.registerApiHandler(a, action, (sourceAppId, payload) => fn(null, payload));
                    }
                } catch (regErr) {
                    console.warn(`[AppLoader] Azione ${action} di ${appId} non registrata:`, regErr.message);
                }
            };
            const ok = modulo.registerBackendHandlers(registerApi, electronApp, {
                getDB, saveDB, AppDbManager,
                readConfig: () => koradestConfig.readConfig(),
                replica: creaReplicatore(manifest),
                kernel: kernel.creaKernel(manifest)
            });
            if (ok === false) throw new Error('registerBackendHandlers ha restituito false');
            pubblicaStrumentiSenzaContratto(manifest, azioniRegistrate);
        } else {
            throw new Error('entry.backend deve esportare attiva(koradest) o registerBackendHandlers');
        }
    }

    for (const a of aliases) {
        _loaded.set(a, { manifest, isProcess: false, directBackend: true, v2: true });
    }
    try {
        const appWatchdog = require('./appWatchdog');
        for (const a of aliases) {
            appWatchdog.resetCircuit(a);
        }
    } catch (_) {}
    auditLogger.logEvent('system', 'APP_LOADED', 'app', appId, { version: manifest.version, manifestVersion: 2 });
    return true;
}

async function unloadApp(appId) {
    try {
        const entry = _loaded.get(appId);
        const aliases = Array.from(new Set([appId, ...aliasesOf(entry && entry.manifest)]));
        for (const a of aliases) {
            try {
                capabilityBroker.revokeAppToken(a);
                capabilityBroker.unregisterApiHandlers(a);
            } catch (revokeErr) {}
        }
        try {
            const appWorkerHost = require('./appWorkerHost');
            appWorkerHost.stopWorker(appId);
        } catch (_) {}
        appProcessManager.terminateAppProcess(appId);

        for (const a of aliases) {
            _loaded.delete(a);
            kernel.rilascia(a);
        }
        try {
            const { toolRegistry } = require('../ai/ollama');
            if (toolRegistry && typeof toolRegistry.unregisterApp === 'function') {
                toolRegistry.unregisterApp(appId);
            }
        } catch (aiErr) {
            console.warn(`[AppLoader] Strumenti AI di ${appId} non rimossi:`, aiErr.message);
        }

        try {
            const appsDir = app && typeof app.getPath === 'function' ? path.join(app.getPath('userData'), 'installed_apps') : '';
            if (appsDir) {
                const targetAppDir = path.join(appsDir, appId).toLowerCase();
                const lowerAppId = appId.toLowerCase();
                Object.keys(require.cache).forEach(key => {
                    const normKey = String(key).toLowerCase();
                    if (normKey.includes(targetAppDir) || normKey.includes(lowerAppId)) {
                        delete require.cache[key];
                    }
                });
            }
        } catch (cacheErr) {}

        auditLogger.logEvent('system', 'APP_UNLOADED', 'app', appId);
        return true;
    } catch (e) {
        return false;
    }
}

async function loadAllInstalledApps() {
    try {
        const clusterAppLifecycle = require('./clusterAppLifecycle');
        await clusterAppLifecycle.reconcileInstalledApps();

        const { getAppsRegistry } = require('./appsRegistry');
        const { getDB, saveDB } = require('../db');
        const manifests = await getAppsRegistry();

        let db = null;
        let installedIds = new Set();
        try {
            db = getDB('store');
            const installedRows = db.query("SELECT app_id FROM installed_apps WHERE status = 'active' AND (is_deleted IS NULL OR is_deleted = 0)");
            installedIds = new Set(installedRows.map(r => r.app_id));
        } catch (e) {}

        let dbChanged = false;

        for (const m of manifests) {
            try {
                if (m.bundled && !installedIds.has(m.id) && db) {
                    db.run(
                        'INSERT INTO installed_apps (app_id, version, installed_at, installed_by, status, is_deleted, last_modified) VALUES (?, ?, ?, ?, ?, 0, ?)',
                        [m.id, m.version || '0.0.0', Math.floor(Date.now() / 1000), 'system', 'active', Math.floor(Date.now() / 1000)]
                    );
                    installedIds.add(m.id);
                    dbChanged = true;
                }
            } catch (seedErr) {}
        }

        if (dbChanged) {
            try {
                await saveDB('store');
            } catch (saveErr) {}
        }

        let loaded = 0;
        let considered = 0;

        for (const manifest of manifests) {
            try {
                const isActive = installedIds.has(manifest.id) || (manifest.folder && installedIds.has(manifest.folder));
                if (manifest.core || isActive) {
                    considered++;
                    const ok = await loadApp(manifest);
                    if (ok) loaded++;
                }
            } catch (mErr) {}
        }

        return loaded;
    } catch (e) {
        return 0;
    }
}


function getLoaded() {
    try {
        return Array.from(_loaded.keys());
    } catch (e) {
        return [];
    }
}

function isLoaded(appId) {
    try {
        return _loaded.has(appId);
    } catch (e) {
        return false;
    }
}

function getManifest(appId) {
    try {
        return _loaded.get(appId)?.manifest || null;
    } catch (e) {
        return null;
    }
}

module.exports = { loadApp, unloadApp, loadAllInstalledApps, getLoaded, isLoaded, getManifest, creaReplicatore, tabelleLocaliDi };
