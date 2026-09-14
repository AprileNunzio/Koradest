'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { DatabaseSync } = require('node:sqlite');

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'koradest-verifica-'));
const esiti = [];

function verifica(descrizione, condizione, dettaglio) {
    esiti.push({ descrizione, superato: Boolean(condizione), dettaglio: dettaglio || '' });
}

function riepiloga() {
    let superati = 0;
    for (const voce of esiti) {
        if (voce.superato) superati += 1;
        const stato = voce.superato ? 'OK  ' : 'FAIL';
        console.log(`${stato} ${voce.descrizione}${voce.dettaglio ? `  [${voce.dettaglio}]` : ''}`);
    }
    console.log(`\n${superati}/${esiti.length} verifiche superate.`);
    return superati === esiti.length;
}

function creaAdattatore() {
    const db = new DatabaseSync(':memory:');
    return {
        db,
        query(sql, params = []) {
            return db.prepare(sql).all(...(params || []));
        },
        run(sql, params = []) {
            return db.prepare(sql).run(...(params || []));
        },
        exec(sql) {
            return db.exec(sql);
        }
    };
}

const archivioStore = creaAdattatore();
for (const migrazione of require('../backend/migrations/store')) {
    archivioStore.exec(migrazione.sql);
}

let superadmin = true;
const appLoaderScaricate = [];
const pacchettiScaricati = [];

const manifestProva = {
    id: 'app_prova',
    folder: 'App-Prova',
    name: 'App di Prova',
    version: '1.0.3',
    db: { namespace: 'prova' },
    downloadUrl: 'https://esempio.invalid/app_prova.zip'
};

const originale = Module._load;
Module._load = function stub(richiesta, ...resto) {
    if (richiesta === 'electron') {
        return { app: { getPath: () => radice }, session: {}, shell: {} };
    }
    if (richiesta.endsWith('/db') || richiesta === '../db') {
        return { getDB: () => archivioStore, saveDB: async () => true };
    }
    if (richiesta.endsWith('access_guard')) {
        return { isSuperadmin: () => superadmin };
    }
    if (richiesta.endsWith('session_manager')) {
        return { getCurrentUserId: () => 'utente-prova' };
    }
    if (richiesta.endsWith('appsRegistry')) {
        return { getAppsRegistry: async () => [manifestProva] };
    }
    if (richiesta.endsWith('AppLoader')) {
        return { unloadApp: async id => { appLoaderScaricate.push(id); return true; }, loadApp: async () => true, getManifest: () => null };
    }
    if (richiesta.endsWith('DependencyResolver')) {
        return { canUninstall: () => ({ canUninstall: true, blockedBy: [] }), resolve: () => [] };
    }
    if (richiesta.endsWith('AppUpdateManager')) {
        return {
            isLocked: () => false,
            beginManualOperation: () => {},
            endManualOperation: () => {},
            startBackgroundCheck: async () => {}
        };
    }
    if (richiesta.endsWith('appPackageFetcher')) {
        return {
            acquisisci: async (appId, manifest) => {
                const buffer = Buffer.from(`pacchetto ${appId} ${manifest.version}`);
                pacchettiScaricati.push(manifest.version);
                const stagingDir = path.join(radice, 'staged_apps', `${appId}_${manifest.version}`);
                fs.mkdirSync(stagingDir, { recursive: true });
                fs.writeFileSync(path.join(stagingDir, 'manifest.json'), JSON.stringify({ ...manifest }));
                return { stagingDir, downloadedFromPeer: false, peerIp: null, buffer };
            },
            daBuffer: async (appId, buffer, versione) => {
                const stagingDir = path.join(radice, 'staged_apps', `${appId}_ripristino_${versione}`);
                fs.mkdirSync(stagingDir, { recursive: true });
                fs.writeFileSync(path.join(stagingDir, 'manifest.json'), JSON.stringify({ ...manifestProva, version: versione }));
                return { stagingDir, downloadedFromPeer: false, peerIp: null, buffer };
            },
            verificaContenuto: () => ({ valido: true }),
            pulisciStagingResidui: () => true
        };
    }
    return originale.call(this, richiesta, ...resto);
};

module.exports = { radice, archivioStore, verifica, riepiloga, manifestProva, pacchettiScaricati, creaAdattatore, ripristinaModuli: () => { Module._load = originale; } };
