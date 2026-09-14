module.exports = [
    {
        version: 18,
        sql: `
            CREATE TABLE IF NOT EXISTS network_policy (
                id            TEXT PRIMARY KEY,
                min_nodes     INTEGER NOT NULL DEFAULT 1,
                enforcement   TEXT NOT NULL DEFAULT 'soft',
                grace_ms      INTEGER NOT NULL DEFAULT 120000,
                updated_by    TEXT NOT NULL DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT 0,
                is_deleted    INTEGER NOT NULL DEFAULT 0
            );
            INSERT OR IGNORE INTO network_policy (id, min_nodes, enforcement, grace_ms, updated_by, last_modified, is_deleted)
            VALUES ('default', 1, 'soft', 120000, '', 0, 0);
        `
    }
,
    {
        version: 19,
        sql: `
            CREATE TABLE IF NOT EXISTS retention_policy (
                id                 TEXT PRIMARY KEY,
                access_logs_days   INTEGER NOT NULL DEFAULT 730,
                notifications_days INTEGER NOT NULL DEFAULT 365,
                system_logs_days   INTEGER NOT NULL DEFAULT 180,
                audit_days         INTEGER NOT NULL DEFAULT 1825,
                enabled            INTEGER NOT NULL DEFAULT 1,
                last_run           INTEGER NOT NULL DEFAULT 0,
                updated_by         TEXT NOT NULL DEFAULT '',
                last_modified      INTEGER NOT NULL DEFAULT 0,
                is_deleted         INTEGER NOT NULL DEFAULT 0
            );
            INSERT OR IGNORE INTO retention_policy (id, last_modified) VALUES ('default', 0);
        `
    }
];