'use strict';
const CURRENT_PAYLOAD_VERSION = 1;

const SYSTEM_EXCLUDED_TABLES = new Set([
    'event_log', 'dag_tips', 'network_config', 'sqlite_sequence',
    'sqlite_stat1', 'sqlite_stat4', 'sqlite_master', '_migrations', 'migrations'
]);

const SYNC_TABLES = [
    'users', 'roles', 'permissions', 'role_permissions', 'groups', 'user_groups',
    'user_roles', 'group_roles', 'group_permissions', 'user_permissions', 'permission_defaults',
    'distributed_logs', 'persone', 'documenti_identita',
    'indirizzi', 'rapporti_lavoro', 'titoli_studio', 'dati_bancari', 'contatti',
    'familiari', 'access_logs', 'webauthn_credentials', 'totp_backup_codes',
    'notification_preferences', 'notifications',
    'installed_apps', 'app_dependencies', 'custom_repositories', 'network_policy', 'retention_policy'
];

const SCHEMAS = {
    users:            { required: ['id', 'username', 'password', 'is_deleted'] },
    roles:            { required: [] },
    permissions:      { required: [] },
    role_permissions: { required: [] },
    groups:           { required: [] },
    user_groups:      { required: [] },
    user_roles:       { required: [] },
    group_roles:      { required: [] },
    group_permissions: { required: [] },
    user_permissions:  { required: [] },
    permission_defaults: { required: [] },
    distributed_logs: { required: ['id', 'node_id', 'level', 'message', 'created_at'] },
    persone:            { required: ['id', 'is_deleted'] },
    documenti_identita: { required: ['id', 'persona_id', 'is_deleted'] },
    indirizzi:          { required: ['id', 'persona_id', 'is_deleted'] },
    rapporti_lavoro:    { required: ['id', 'persona_id', 'is_deleted'] },
    titoli_studio:      { required: ['id', 'persona_id', 'is_deleted'] },
    dati_bancari:       { required: ['id', 'persona_id', 'is_deleted'] },
    contatti:           { required: ['id', 'persona_id', 'is_deleted'] },
    familiari:          { required: ['id', 'persona_id', 'is_deleted'] },
    access_logs:               { required: ['id', 'user_id', 'timestamp'] },
    webauthn_credentials:      { required: ['id', 'user_id', 'credential_id'] },
    totp_backup_codes:         { required: ['id', 'user_id', 'code_hash'] },
    notification_preferences: { required: ['id', 'user_id', 'category'] },
    notifications:             { required: ['id', 'user_id', 'category'] },
    installed_apps:            { required: ['app_id'] },
    app_dependencies:          { required: ['app_id', 'depends_on'] },
    custom_repositories:       { required: ['id', 'url'] },
    network_policy:            { required: ['id', 'min_nodes', 'enforcement'] },
    retention_policy:          { required: ['id'] }
};

const TABLE_DOMAINS = {
    persone: 'app_anagrafica',
    documenti_identita: 'app_anagrafica',
    indirizzi: 'app_anagrafica',
    rapporti_lavoro: 'app_anagrafica',
    titoli_studio: 'app_anagrafica',
    dati_bancari: 'app_anagrafica',
    contatti: 'app_anagrafica',
    familiari: 'app_anagrafica',
    installed_apps: 'store',
    app_dependencies: 'store',
    custom_repositories: 'store'
};

const _dynamicTableDomains = new Map();
const _dynamicSyncTables = new Set();
const _localTables = new Set();

function registerLocalTables(tables) {
    try {
        if (!Array.isArray(tables)) return;
        for (const tbl of tables) {
            if (typeof tbl === 'string' && tbl.length > 0) {
                _localTables.add(tbl.toLowerCase());
                _dynamicSyncTables.delete(tbl);
            }
        }
    } catch (_) {}
}

function isTableLocal(tableName) {
    try {
        return typeof tableName === 'string' && _localTables.has(tableName.toLowerCase());
    } catch (_) {
        return false;
    }
}

function registerDynamicDomain(domain, tables) {
    try {
        if (!domain || !Array.isArray(tables)) return;
        for (const tbl of tables) {
            if (typeof tbl === 'string' && tbl.length > 0) {
                _dynamicTableDomains.set(tbl, domain);
                _dynamicSyncTables.add(tbl);
            }
        }
    } catch (_) {}
}

function unregisterDynamicDomain(domain) {
    try {
        if (!domain) return;
        for (const [tbl, dom] of _dynamicTableDomains.entries()) {
            if (dom === domain) {
                _dynamicTableDomains.delete(tbl);
                _dynamicSyncTables.delete(tbl);
            }
        }
    } catch (_) {}
}

function isTableSyncable(tableName) {
    try {
        if (!tableName || typeof tableName !== 'string') return false;
        const lower = tableName.toLowerCase();
        if (lower.startsWith('sqlite_')) return false;
        if (lower.startsWith('_k_')) return false;
        if (SYSTEM_EXCLUDED_TABLES.has(lower)) return false;
        if (_localTables.has(lower)) return false;
        return true;
    } catch (_) {
        return false;
    }
}

function getSchema(tableName) {
    try {
        if (SCHEMAS[tableName]) return SCHEMAS[tableName];
        return { required: [] };
    } catch (_) {
        return { required: [] };
    }
}

function getDomainForTable(tableName) {
    try {
        if (TABLE_DOMAINS[tableName]) return TABLE_DOMAINS[tableName];
        if (_dynamicTableDomains.has(tableName)) return _dynamicTableDomains.get(tableName);
        try {
            const dbManager = require('../../db/db_manager');
            if (dbManager && dbManager.databases) {
                for (const domain of Object.keys(dbManager.databases)) {
                    if (domain === 'config' || domain === 'ledger') continue;
                    const db = dbManager.databases[domain];
                    if (db) {
                        const check = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
                        if (check && check.length > 0) {
                            _dynamicTableDomains.set(tableName, domain);
                            return domain;
                        }
                    }
                }
            }
        } catch (_) {}
        return 'auth';
    } catch (_) {
        return 'auth';
    }
}

module.exports = {
    CURRENT_PAYLOAD_VERSION,
    SYNC_TABLES,
    getSchema,
    getDomainForTable,
    registerDynamicDomain,
    unregisterDynamicDomain,
    registerLocalTables,
    isTableLocal,
    isTableSyncable
};

