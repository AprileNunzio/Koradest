'use strict';
const dbManager = require('../db/db_manager');
const _loadedNamespaces = new Set();
function _versione(adapter) {
    try {
        const righe = adapter.query('PRAGMA user_version;');
        return righe && righe.length > 0 ? Number(righe[0].user_version) || 0 : 0;
    } catch (e) {
        return 0;
    }
}

async function applicaMigrazioniPendenti(domain, adapter, migrations) {
    try {
        if (!adapter || typeof adapter.runMigrations !== 'function') return false;
        if (!Array.isArray(migrations) || migrations.length === 0) return false;
        const prima = _versione(adapter);
        const attesa = migrations.reduce((massimo, m) => Math.max(massimo, Number(m.version) || 0), 0);
        if (attesa <= prima) return false;
        adapter.runMigrations(migrations);
        const dopo = _versione(adapter);
        if (dopo === prima) return false;
        await dbManager.saveDatabase(domain);
        console.log(`[AppDbManager] ${domain}: migrazioni applicate a caldo (${prima} -> ${dopo}).`);
        return true;
    } catch (e) {
        console.error(`[AppDbManager] ${domain}: migrazione a caldo fallita:`, e.message);
        return false;
    }
}

async function getOrCreate(namespace, migrations = []) {
    try {
        const domain = `app_${namespace}`;
        try {
            const existing = dbManager.getDB(domain);
            if (existing) {
                await applicaMigrazioniPendenti(domain, existing, migrations);
                return existing;
            }
        } catch (e) {
            if (e.message !== 'DB_NOT_INITIALIZED') throw e;
        }
        if (!(domain in dbManager.databases)) {
            dbManager.databases[domain] = null;
        }
        await dbManager.loadDatabase(domain, migrations);
        _loadedNamespaces.add(namespace);
        return dbManager.getDB(domain);
    } catch (err) {
        return null;
    }
}
function get(namespace) {
    try {
        return dbManager.getDB(`app_${namespace}`);
    } catch (err) {
        return null;
    }
}
async function save(namespace, immediate = false) {
    try {
        return await dbManager.saveDatabase(`app_${namespace}`, immediate);
    } catch (err) {
        return false;
    }
}
function isLoaded(namespace) {
    try {
        return _loadedNamespaces.has(namespace);
    } catch (err) {
        return false;
    }
}
function getLoadedNamespaces() {
    try {
        return Array.from(_loadedNamespaces);
    } catch (err) {
        return [];
    }
}

function unload(namespace) {
    try {
        _loadedNamespaces.delete(namespace);
        const domain = `app_${namespace}`;
        if (domain in dbManager.databases) {
            dbManager.databases[domain] = null;
            delete dbManager.databases[domain];
        }
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = { getOrCreate, get, save, isLoaded, getLoadedNamespaces, applicaMigrazioniPendenti, unload };


