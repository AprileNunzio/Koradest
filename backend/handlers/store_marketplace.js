'use strict';

const path = require('path');
const fs = require('fs');
const { getDB, saveDB } = require('../db');
const appsRegistry = require('../core/appsRegistry');
const dbManager = require('../db/db_manager');
const {
    PRIMARY_MARKETPLACE_URL,
    FALLBACK_MARKETPLACE_URL,
    getTimestamp,
    getStoreDB,
    fetchWithTimeout
} = require('./store_repositories');

let marketplaceCache = null;

function clearMarketplaceCache() {
    marketplaceCache = null;
}

async function getInstalledDiskApps() {
    try {
        const { app } = require('electron');
        if (!app) return [];
        const userAppsPath = path.join(app.getPath('userData'), 'installed_apps');
        const installedList = [];

        if (fs.existsSync(userAppsPath)) {
            const dirs = fs.readdirSync(userAppsPath, { withFileTypes: true });
            for (const d of dirs) {
                if (d.isDirectory()) {
                    const manifestPath = path.join(userAppsPath, d.name, 'manifest.json');
                    if (fs.existsSync(manifestPath)) {
                        try {
                            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                            manifest.folder = d.name;
                            manifest.id = manifest.id || d.name;
                            manifest.appPath = path.join(userAppsPath, d.name);
                            installedList.push(manifest);
                        } catch (_) {}
                    }
                }
            }
        }
        return installedList;
    } catch (_) {
        return [];
    }
}

async function getInstalledRows() {
    try {
        const db = getStoreDB();
        const rows = db ? db.query("SELECT * FROM installed_apps WHERE status = 'active' AND (is_deleted IS NULL OR is_deleted = 0)") : [];
        const diskApps = await getInstalledDiskApps();

        diskApps.forEach(m => {
            const existing = rows.find(r => r.app_id === m.id || r.app_id === m.folder);
            if (existing) {
                if (m.version && existing.version !== m.version && db) {
                    const ts = getTimestamp();
                    db.run("UPDATE installed_apps SET version = ?, updated_at = ?, last_modified = ? WHERE app_id = ?", [m.version, ts, ts, existing.app_id]);
                    existing.version = m.version;
                    existing.updated_at = ts;
                    existing.last_modified = ts;
                }
            } else {
                const ts = getTimestamp();
                if (db) {
                    db.run("INSERT OR IGNORE INTO installed_apps (app_id, version, installed_at, updated_at, status, is_deleted, last_modified) VALUES (?, ?, ?, ?, 'active', 0, ?)", [m.id, m.version || '1.0.0', ts, ts, ts]);
                }
                rows.push({ app_id: m.id, version: m.version || '1.0.0', installed_at: ts, updated_at: ts, status: 'active', is_deleted: 0, last_modified: ts });
            }
        });
        return rows;
    } catch (_) {
        return [];
    }
}

async function fetchRemoteMarketplace(forceRefresh = false) {
    try {
        if (!forceRefresh && marketplaceCache) return marketplaceCache;

        const bust = Date.now() + '_' + Math.random().toString(36).slice(2);
        const noCache = { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' };
        let officialData = null;

        try {
            const res = await fetch(PRIMARY_MARKETPLACE_URL + '?t=' + bust, { headers: noCache });
            if (res.ok) officialData = await res.json();
        } catch (_) {}

        if (!officialData && FALLBACK_MARKETPLACE_URL) {
            try {
                const resFallback = await fetch(FALLBACK_MARKETPLACE_URL + '?t=' + bust, { headers: noCache });
                if (resFallback.ok) officialData = await resFallback.json();
            } catch (_) {}
        }

        if (!officialData || !Array.isArray(officialData)) {
            return marketplaceCache || [];
        }

        officialData.forEach(app => { app.__source = 'official'; });
        const officialIds = new Set(officialData.map(a => a.id));
        const mergedApps = [...officialData];

        try {
            const db = getStoreDB();
            const customRepos = db ? db.query('SELECT * FROM custom_repositories WHERE enabled = 1') : [];
            if (customRepos.length > 0) {
                const results = await Promise.allSettled(customRepos.map(async (repo) => {
                    const res = await fetchWithTimeout(repo.url + '?t=' + bust, { headers: noCache }, 10000);
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const data = await res.json();
                    if (!Array.isArray(data)) throw new Error('Formato non valido: atteso un array JSON');
                    return data;
                }));

                results.forEach((result, idx) => {
                    const repo = customRepos[idx];
                    if (result.status === 'fulfilled') {
                        if (db) db.run('UPDATE custom_repositories SET last_checked = ?, last_status = ?, last_error = NULL WHERE id = ?', [getTimestamp(), 'ok', repo.id]);
                        result.value.forEach(app => {
                            if (!app || !app.id) return;
                            if (officialIds.has(app.id)) return;
                            if (mergedApps.some(a => a.id === app.id)) return;
                            mergedApps.push({ ...app, __source: 'custom', __sourceLabel: repo.label, __sourceId: repo.id });
                        });
                    } else {
                        const errMsg = String((result.reason && result.reason.message) || result.reason || 'Errore sconosciuto');
                        if (db) db.run('UPDATE custom_repositories SET last_checked = ?, last_status = ?, last_error = ? WHERE id = ?', [getTimestamp(), 'error', errMsg, repo.id]);
                    }
                });
                if (db) await saveDB('store');
            }
        } catch (_) {}

        marketplaceCache = mergedApps;
        return mergedApps;
    } catch (_) {
        return marketplaceCache || [];
    }
}

async function getAvailable() {
    try {
        const localManifests = await appsRegistry.getAppsRegistry();
        const diskApps = await getInstalledDiskApps();
        const installedRows = await getInstalledRows();

        const diskMap = new Map();
        diskApps.forEach(a => diskMap.set(a.id, a));
        localManifests.filter(m => !m.core).forEach(m => diskMap.set(m.id, m));

        const dbMap = new Map();
        installedRows.forEach(r => dbMap.set(r.app_id, r));

        const remoteManifests = await fetchRemoteMarketplace();
        const allAppIds = new Set([
            ...Array.from(diskMap.keys()),
            ...remoteManifests.map(m => m.id)
        ]);

        const result = [];
        allAppIds.forEach(id => {
            const diskManifest = diskMap.get(id);
            const remoteManifest = remoteManifests.find(m => m.id === id);
            const dbRow = dbMap.get(id);

            const isInstalled = !!(diskManifest || dbRow);
            const installedVersion = diskManifest ? diskManifest.version : (dbRow ? dbRow.version : null);
            const remoteVersion = remoteManifest ? remoteManifest.version : null;
            const latestVersion = remoteVersion || installedVersion || '1.0.0';

            let hasUpdate = false;
            if (isInstalled && installedVersion && remoteVersion) {
                const rParts = String(remoteVersion).split('.').map(n => parseInt(n, 10) || 0);
                const iParts = String(installedVersion).split('.').map(n => parseInt(n, 10) || 0);
                for (let i = 0; i < Math.max(rParts.length, iParts.length); i++) {
                    const r = rParts[i] || 0;
                    const ins = iParts[i] || 0;
                    if (r > ins) {
                        hasUpdate = true;
                        break;
                    }
                    if (r < ins) {
                        hasUpdate = false;
                        break;
                    }
                }
            }

            const baseApp = remoteManifest || diskManifest || {};

            result.push({
                ...baseApp,
                id,
                name: baseApp.name || id,
                version: latestVersion,
                installedVersion: installedVersion,
                installed: isInstalled,
                hasUpdate: hasUpdate,
                published_at: baseApp.published_at || baseApp.release_date || (dbRow && dbRow.published_at) || null,
                installed_at: (dbRow && dbRow.installed_at) || (diskManifest && diskManifest.installed_at) || null,
                updated_at: (dbRow && dbRow.updated_at) || baseApp.updated_at || baseApp.last_updated || (dbRow && dbRow.installed_at) || null
            });
        });

        return { success: true, data: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getInstalled() {
    try {
        const availableRes = await getAvailable();
        if (availableRes && availableRes.success) {
            const installedApps = availableRes.data.filter(a => a.installed);
            return { success: true, data: installedApps };
        }
        return { success: true, data: [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getCoreApps() {
    try {
        const manifests = await appsRegistry.getAppsRegistry();
        const data = manifests.filter(m => m.core).map(m => ({
            ...m,
            published_at: m.published_at || m.release_date || null,
            installed_at: m.installed_at || null,
            updated_at: m.updated_at || m.last_updated || null
        }));
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function checkUpdates() {
    try {
        marketplaceCache = null;
        const availableRes = await getAvailable();
        if (!availableRes || !availableRes.success) return { success: true, data: [] };

        const installate = await getInstalledRows();
        const idInstallati = new Set(installate.map(riga => riga.app_id));

        const updates = availableRes.data
            .filter(a => idInstallati.has(a.id))
            .filter(a => a.hasUpdate)
            .map(a => ({
                appId: a.id,
                currentVersion: a.installedVersion,
                availableVersion: a.version
            }));

        return { success: true, data: updates };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function preloadMarketplaceCache() {
    try {
        await fetchRemoteMarketplace();
    } catch (_) {}
}

async function syncNetworkApps() {
    try {
        const availableRes = await getAvailable();
        if (availableRes && availableRes.success) {
            return { success: true, count: availableRes.data.length };
        }
        return { success: true, count: 0 };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getClusterAppMatrix() {
    try {
        const sync = require('../sync');
        const nodes = (typeof sync.getDetailedNodes === 'function' ? sync.getDetailedNodes() : []) || [];
        const installedRes = await getInstalled();
        const installedApps = installedRes.success ? installedRes.data : [];
        const driftDetector = require('../core/clusterStateDriftDetector');
        const merkleRoot = driftDetector.getStateMerkleRoot();

        const matrix = installedApps.map(appItem => {
            const dbPath = path.join(dbManager.basePath || '', 'app_' + appItem.id + '.enc');
            const hasLocalDb = fs.existsSync(dbPath);
            const dbSize = hasLocalDb ? fs.statSync(dbPath).size : 0;

            const nodeStatuses = nodes.map(n => ({
                nodeId: n.id || n.ip,
                nodeName: n.name || n.ip,
                status: n.status || 'Active',
                version: appItem.version
            }));

            return {
                appId: appItem.id,
                name: appItem.name || appItem.id,
                version: appItem.version,
                hasLocalDb,
                dbSize,
                nodes: nodeStatuses
            };
        });

        return {
            success: true,
            data: {
                matrix,
                merkleRoot,
                connectedNodesCount: nodes.length
            }
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    fetchRemoteMarketplace,
    getInstalledDiskApps,
    getInstalledRows,
    getAvailable,
    getInstalled,
    getCoreApps,
    checkUpdates,
    preloadMarketplaceCache,
    syncNetworkApps,
    clearMarketplaceCache,
    getClusterAppMatrix
};
