'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const dbManager = require('../db/db_manager');
const AppDbManager = require('./AppDbManager');
const schemaRegistry = require('../dag/schema/schema_registry');

function radiceUtente() {
    try {
        return app.getPath('userData');
    } catch (_) {
        return process.cwd();
    }
}

function cartellaArchivi() {
    try {
        dbManager.initPaths();
        return dbManager.basePath;
    } catch (_) {
        return null;
    }
}

function risolviInformazioniApp(appId, manifest) {
    try {
        let folder = (manifest && manifest.folder) || appId;
        let namespace = (manifest && manifest.db && manifest.db.namespace) || appId;

        if (!manifest) {
            const appsDir = path.join(radiceUtente(), 'installed_apps');
            if (fs.existsSync(appsDir)) {
                const entries = fs.readdirSync(appsDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const mPath = path.join(appsDir, entry.name, 'manifest.json');
                        if (fs.existsSync(mPath)) {
                            try {
                                const diskManifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
                                if (diskManifest.id === appId || entry.name === appId) {
                                    folder = entry.name;
                                    if (diskManifest.db && diskManifest.db.namespace) {
                                        namespace = diskManifest.db.namespace;
                                    }
                                    break;
                                }
                            } catch (_) {}
                        } else if (entry.name === appId) {
                            folder = entry.name;
                            break;
                        }
                    }
                }
            }
        }

        return { folder, namespace, dominio: 'app_' + namespace };
    } catch (_) {
        return { folder: appId, namespace: appId, dominio: 'app_' + appId };
    }
}

function dominioDi(manifest, appId) {
    try {
        return risolviInformazioniApp(appId, manifest).dominio;
    } catch (_) {
        return 'app_' + appId;
    }
}

function shredGuardedFile(percorso) {
    try {
        if (!percorso || !fs.existsSync(percorso)) return;
        const stat = fs.statSync(percorso);
        if (stat.isFile() && stat.size > 0) {
            const shredSize = Math.min(stat.size, 65536);
            const randomBytes = crypto.randomBytes(shredSize);
            const fd = fs.openSync(percorso, 'r+');
            fs.writeSync(fd, randomBytes, 0, shredSize, 0);
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        }
        fs.rmSync(percorso, { recursive: true, force: true });
    } catch (_) {
        try { fs.rmSync(percorso, { recursive: true, force: true }); } catch (_) {}
    }
}

function rimuoviPercorso(percorso, esiti, etichetta) {
    try {
        if (!percorso || !fs.existsSync(percorso)) return;
        const stato = fs.statSync(percorso);
        const dimensione = stato.isDirectory() ? null : stato.size;

        if (percorso.endsWith('.enc') || percorso.endsWith('.enc.tmp') || percorso.endsWith('.enc.bak') || percorso.endsWith('.enc.backup')) {
            shredGuardedFile(percorso);
        } else {
            fs.rmSync(percorso, { recursive: true, force: true });
        }

        if (esiti) esiti.push({ etichetta, percorso, dimensione, rimosso: true });
    } catch (errore) {
        if (esiti) esiti.push({ etichetta, percorso, rimosso: false, errore: errore.message });
    }
}

function fileArchivio(dominio) {
    try {
        const base = cartellaArchivi();
        if (!base) return [];
        const suffissi = ['.enc', '.enc.tmp', '.enc.bak', '.enc.backup'];
        return suffissi.map(suffisso => path.join(base, dominio + suffisso));
    } catch (_) {
        return [];
    }
}

function backupArchivio(dominio) {
    try {
        const base = cartellaArchivi();
        if (!base) return [];
        const cartellaBackup = path.join(base, 'backups');
        if (!fs.existsSync(cartellaBackup)) return [];
        return fs.readdirSync(cartellaBackup)
            .filter(nome => nome.startsWith(dominio))
            .map(nome => path.join(cartellaBackup, nome));
    } catch (_) {
        return [];
    }
}

function scaricaDominioInMemoria(dominio, namespace) {
    try {
        if (namespace) {
            AppDbManager.unload(namespace);
        }
        if (dominio in dbManager.databases) {
            dbManager.databases[dominio] = null;
            delete dbManager.databases[dominio];
        }
        schemaRegistry.unregisterDynamicDomain(dominio);
        return true;
    } catch (_) {
        return false;
    }
}

function anteprima(appId, manifest) {
    try {
        const info = risolviInformazioniApp(appId, manifest);
        const voci = [];

        const aggiungi = (etichetta, percorso) => {
            try {
                if (percorso && fs.existsSync(percorso)) voci.push({ etichetta, percorso });
            } catch (_) {}
        };

        aggiungi('Programma installato', path.join(radiceUtente(), 'installed_apps', info.folder));
        for (const file of fileArchivio(info.dominio)) aggiungi('Archivio dati', file);
        for (const file of backupArchivio(info.dominio)) aggiungi('Backup archivio', file);
        aggiungi('File temporanei', path.join(radiceUtente(), 'staged_apps', info.folder));
        aggiungi('Cache applicazione', path.join(radiceUtente(), 'app_cache', appId));
        aggiungi('Impostazioni applicazione', path.join(radiceUtente(), 'app_settings', appId + '.json'));
        aggiungi('File dell\'applicazione', cartellaFileApp(appId));

        return { dominio: info.dominio, voci, quante: voci.length };
    } catch (e) {
        return { dominio: 'app_' + appId, voci: [], quante: 0 };
    }
}

function cartellaFileApp(appId) {
    const base = cartellaArchivi();
    if (!base) return null;
    try {
        return require('./kernel/app_files').cartellaAppIn(base, appId);
    } catch (errore) {
        console.warn('[AppDataPurger] Cartella file non determinabile per', appId, errore.message);
        return null;
    }
}

function purga(appId, manifest) {
    try {
        const info = risolviInformazioniApp(appId, manifest);
        const esiti = [];

        scaricaDominioInMemoria(info.dominio, info.namespace);

        const targetFolder = path.join(radiceUtente(), 'installed_apps', info.folder);
        try {
            Object.keys(require.cache).forEach(key => {
                if (key.startsWith(targetFolder) || key.includes(appId) || key.includes(info.folder)) {
                    delete require.cache[key];
                }
            });
        } catch (_) {}

        rimuoviPercorso(targetFolder, esiti, 'Programma installato');
        for (const file of fileArchivio(info.dominio)) rimuoviPercorso(file, esiti, 'Archivio dati');
        for (const file of backupArchivio(info.dominio)) rimuoviPercorso(file, esiti, 'Backup archivio');
        if (info.namespace && info.namespace !== appId) {
            for (const file of fileArchivio('app_' + appId)) rimuoviPercorso(file, esiti, 'Archivio alternativo');
            for (const file of backupArchivio('app_' + appId)) rimuoviPercorso(file, esiti, 'Backup alternativo');
        }
        rimuoviPercorso(path.join(radiceUtente(), 'staged_apps', info.folder), esiti, 'File temporanei');
        rimuoviPercorso(path.join(radiceUtente(), 'app_cache', appId), esiti, 'Cache applicazione');
        rimuoviPercorso(path.join(radiceUtente(), 'app_settings', appId + '.json'), esiti, 'Impostazioni applicazione');

        const falliti = esiti.filter(voce => !voce.rimosso);
        return {
            dominio: info.dominio,
            rimossi: esiti.filter(voce => voce.rimosso).length,
            falliti,
            completo: falliti.length === 0,
            dettagli: esiti
        };
    } catch (errore) {
        return {
            dominio: 'app_' + appId,
            rimossi: 0,
            falliti: [{ etichetta: 'Generale', errore: errore.message }],
            completo: false,
            dettagli: []
        };
    }
}

module.exports = { anteprima, purga, dominioDi, risolviInformazioniApp };
