'use strict';
const crypto = require('crypto');
const dbManager = require('./db_manager');
const SqlJsAdapter = require('./SqlJsAdapter');

const MIGRATIONS = {
    auth: require('../migrations/auth'),
    config: require('../migrations/config'),
    ledger: require('../migrations/ledger'),
    app: require('../migrations/app_data'),
    store: require('../migrations/store'),
    app_anagrafica: require('../migrations/anagrafica'),
    app_azienda: require('../migrations/azienda'),
    audit: require('../migrations/audit')
};

async function importClonedBundle(bundle, networkCode, networkName) {
    try {
        const targetNode = networkName || bundle.networkName || 'Koradest Network';
        const ident = require('../networks/registry/network_identity').identityOf(networkCode);
        if (!dbManager.basePath) return { success: false, error: 'Nessuno spazio di lavoro di rete associato' };
        if (!dbManager.setDeviceKey(ident.dbKey)) return { success: false, error: 'Chiave di cifratura non valida' };
        await dbManager.reset();
        const dbs = bundle.databases || {};
        for (const [domain, migration] of Object.entries(MIGRATIONS)) {
            try {
                if (dbs[domain]) {
                    const buf = Buffer.from(dbs[domain], 'base64');
                    const adapter = new SqlJsAdapter();
                    await adapter.connect({ buffer: buf });
                    await adapter.runMigrations(migration);
                    dbManager.databases[domain] = adapter;
                } else {
                    await dbManager.loadDatabase(domain, migration);
                }
            } catch (loadErr) {
                await dbManager.loadDatabase(domain, migration);
            }
        }

        for (const [domain, b64Data] of Object.entries(dbs)) {
            if (!(domain in MIGRATIONS) && b64Data) {
                try {
                    const buf = Buffer.from(b64Data, 'base64');
                    const adapter = new SqlJsAdapter();
                    await adapter.connect({ buffer: buf });
                    dbManager.databases[domain] = adapter;
                    await dbManager.saveDatabase(domain);
                } catch (customErr) {}
            }
        }

        const nodeId = crypto.randomBytes(16).toString('hex');
        const configDb = dbManager.getDB('config');
        await configDb.execute("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)", ['network_code_hash', ident.membershipHash]);
        await configDb.execute("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)", ['network_code', ident.code]);
        await configDb.execute("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)", ['network_public_id', ident.publicId]);
        await configDb.execute("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)", ['node_id', nodeId]);
        await configDb.execute("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES (?, ?)", ['network_name', targetNode]);
        await dbManager.saveAll();
        try {
            const { rebuildFromLog } = require('../dag/application/state_rebuilder');
            await rebuildFromLog();
        } catch (_) {}
        try {
            const clusterAppLifecycle = require('../core/clusterAppLifecycle');
            await clusterAppLifecycle.reconcileInstalledApps();
        } catch (_) {}
        await dbManager.saveAll();
        const authDb = dbManager.getDB('auth');

        const userRows = authDb.query("SELECT COUNT(*) as cnt FROM users WHERE is_deleted = 0");
        const userCount = userRows && userRows.length > 0 ? userRows[0].cnt : 0;
        return {
            success: true,
            userCount,
            apps: bundle.apps || []
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { importClonedBundle };
