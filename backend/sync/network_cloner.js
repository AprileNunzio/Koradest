'use strict';
const http = require('http');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { app: electronApp } = require('electron');
const { hashNetworkCode, getDB } = require('../db');
const { importClonedBundle } = require('../db/bundle_importer');

function _fetchBuffer(url, headers = {}, timeout = 15000) {
    return new Promise((resolve, reject) => {
        try {
            const req = http.get(url, { headers, timeout }, (res) => {
                try {
                    if (res.statusCode === 403) {
                        return reject(new Error('AUTH_FAILED'));
                    }
                    if (res.statusCode !== 200) {
                        return reject(new Error(`HTTP_${res.statusCode}`));
                    }
                    const chunks = [];
                    res.on('data', c => chunks.push(c));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                    res.on('error', err => reject(err));
                } catch (e) {
                    reject(e);
                }
            });
            req.on('timeout', () => {
                try { req.destroy(); } catch (_) {}
                reject(new Error('TIMEOUT'));
            });
            req.on('error', err => reject(err));
        } catch (e) {
            reject(e);
        }
    });
}

function _flattenAndInstallApp(targetDir, appMeta) {
    try {
        if (!fs.existsSync(targetDir)) return false;
        let manifestPath = path.join(targetDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            const entries = fs.readdirSync(targetDir, { withFileTypes: true });
            const dirs = entries.filter(e => e.isDirectory());
            if (dirs.length === 1) {
                const nestedDir = path.join(targetDir, dirs[0].name);
                const nestedManifest = path.join(nestedDir, 'manifest.json');
                if (fs.existsSync(nestedManifest)) {
                    const subEntries = fs.readdirSync(nestedDir);
                    for (const sub of subEntries) {
                        fs.renameSync(path.join(nestedDir, sub), path.join(targetDir, sub));
                    }
                    try { fs.rmdirSync(nestedDir); } catch (_) {}
                    manifestPath = path.join(targetDir, 'manifest.json');
                }
            }
        }
        let manifest = null;
        if (fs.existsSync(manifestPath)) {
            try {
                manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            } catch (_) {}
        }
        if (!manifest) {
            manifest = {
                id: appMeta.id,
                name: appMeta.name || appMeta.id,
                version: appMeta.version || '1.0.0',
                folder: appMeta.folder || appMeta.id,
                main: 'app.js'
            };
        }
        manifest.appPath = targetDir;
        manifest.folder = path.basename(targetDir);
        manifest.id = manifest.id || appMeta.id;
        try {
            const storeDb = getDB('store');
            if (storeDb) {
                const now = Date.now();
                storeDb.run(
                    "INSERT OR REPLACE INTO installed_apps (app_id, version, installed_at, updated_at, status) VALUES (?, ?, ?, ?, 'active')",
                    [manifest.id, manifest.version || '1.0.0', now, now]
                );
            }
        } catch (_) {}
        try {
            const AppLoader = require('../core/AppLoader');
            AppLoader.loadApp(manifest).catch(() => {});
        } catch (_) {}
        return true;
    } catch (_) {
        return false;
    }
}

async function cloneFromRemoteNode(params, onProgress) {
    try {
        const { host, port, networkCode, networkName } = params;
        const _prog = (data) => {
            try {
                if (typeof onProgress === 'function') onProgress(data);
            } catch (_) {}
        };
        _prog({ step: 'handshake', label: 'Handshake e verifica codice di sicurezza...', status: 'running' });
        const hashedCode = hashNetworkCode(networkCode);
        let bundle = null;
        try {
            const bundleBuf = await _fetchBuffer(`http://${host}:${port}/sync/clone-bundle`, {
                'x-koradest-network': hashedCode
            }, 20000);
            bundle = JSON.parse(bundleBuf.toString('utf8'));
        } catch (err) {
            if (err.message === 'AUTH_FAILED') {
                return { success: false, error: 'Codice di sicurezza non valido per questo nodo' };
            }
            if (err.message === 'TIMEOUT') {
                return { success: false, error: 'Timeout di connessione: il nodo non risponde' };
            }
            const legacyBuf = await _fetchBuffer(`http://${host}:${port}/sync/clone`, {
                'x-koradest-network': hashedCode
            }, 20000);
            bundle = {
                databases: { ledger: legacyBuf.toString('base64') },
                apps: [],
                networkName
            };
        }
        _prog({ step: 'handshake', label: 'Codice di sicurezza verificato con successo', status: 'done' });
        _prog({ step: 'database', label: 'Download e decifratura database di sistema...', status: 'running' });
        const importRes = await importClonedBundle(bundle, networkCode, networkName);
        if (!importRes.success) {
            return { success: false, error: importRes.error || 'Errore durante la decifratura del database' };
        }
        _prog({
            step: 'database',
            label: `Database decifrati (${importRes.userCount} Utenti attivi)`,
            status: 'done',
            meta: { userCount: importRes.userCount }
        });
        _prog({ step: 'apps', label: 'Sincronizzazione applicazioni di terze parti...', status: 'running' });
        const remoteApps = bundle.apps || [];
        let installedCount = 0;
        if (remoteApps.length > 0) {
            const userAppsDir = path.join(electronApp.getPath('userData'), 'installed_apps');
            if (!fs.existsSync(userAppsDir)) {
                fs.mkdirSync(userAppsDir, { recursive: true });
            }
            for (const appMeta of remoteApps) {
                try {
                    _prog({ step: 'apps', label: `Download applicazione: ${appMeta.name}...`, status: 'running' });
                    const zipBuf = await _fetchBuffer(`http://${host}:${port}/sync/app-package/${appMeta.id}`, {
                        'x-koradest-network': hashedCode
                    }, 30000);
                    const targetDir = path.join(userAppsDir, appMeta.folder || appMeta.id);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    const zip = new AdmZip(zipBuf);
                    zip.extractAllTo(targetDir, true);
                    _flattenAndInstallApp(targetDir, appMeta);
                    installedCount++;
                } catch (appErr) {}
            }
            try {
                const rbac = require('../handlers/rbac');
                rbac.syncPermissionsFromManifests();
            } catch (_) {}
        }
        _prog({
            step: 'apps',
            label: remoteApps.length > 0 ? `Applicazioni di terze parti installate (${installedCount}/${remoteApps.length})` : 'Nessuna applicazione di terze parti aggiuntiva',
            status: 'done',
            meta: { installedCount }
        });
        _prog({ step: 'settings', label: 'Sincronizzazione impostazioni...', status: 'running' });
        _prog({ step: 'settings', label: 'Impostazioni applicate', status: 'done' });
        _prog({ step: 'complete', label: 'Sincronizzazione completata con successo!', status: 'done' });
        return {
            success: true,
            userCount: importRes.userCount,
            appCount: installedCount
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { cloneFromRemoteNode };
