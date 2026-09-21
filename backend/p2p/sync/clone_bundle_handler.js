'use strict';
const path = require('path');
const fs = require('fs');
const { getDB } = require('../../db');
const { verifyNetworkHash } = require('../network_auth');
const appsRegistry = require('../../core/appsRegistry');
const dbManager = require('../../db/db_manager');

async function handleCloneBundle(req, res) {
    try {
        const authorized = await verifyNetworkHash(req.headers['x-koradest-network']);
        if (!authorized) {
            return res.status(403).json({ error: 'Network code mismatch' });
        }
        try {
            await dbManager.saveAll();
        } catch (_) {}

        const domainsToExport = new Set([
            'auth', 'config', 'ledger', 'app', 'store', 'app_anagrafica', 'app_azienda', 'audit'
        ]);

        let activeAppIds = new Set();
        try {
            const storeDb = getDB('store');
            if (storeDb) {
                const rows = storeDb.query("SELECT app_id FROM installed_apps WHERE status = 'active' AND (is_deleted IS NULL OR is_deleted = 0)");
                activeAppIds = new Set((rows || []).map(r => r.app_id));
            }
        } catch (_) {}

        const manifests = await appsRegistry.getAppsRegistry();
        for (const m of manifests) {
            try {
                if (m.db && m.db.namespace) {
                    if (m.core || activeAppIds.has(m.id) || activeAppIds.has(m.folder)) {
                        domainsToExport.add(`app_${m.db.namespace}`);
                    }
                }
            } catch (_) {}
        }

        const databases = {};
        for (const domain of domainsToExport) {
            try {
                let db = getDB(domain);
                if (db && typeof db.exportData === 'function') {
                    const buf = db.exportData();
                    if (buf && buf.length > 0) {
                        databases[domain] = Buffer.from(buf).toString('base64');
                        continue;
                    }
                }
                if (dbManager.basePath && dbManager.deviceKey) {
                    const filePath = path.join(dbManager.basePath, `${domain}.enc`);
                    if (fs.existsSync(filePath)) {
                        const encryptedBuffer = fs.readFileSync(filePath);
                        const decryptedBuffer = dbManager.decryptBuffer(encryptedBuffer, dbManager.deviceKey);
                        if (decryptedBuffer && decryptedBuffer.length > 0) {
                            databases[domain] = Buffer.from(decryptedBuffer).toString('base64');
                        }
                    }
                }
            } catch (_) {}
        }

        const thirdPartyApps = [];
        const { app: electronApp } = require('electron');
        const userAppsDir = path.join(electronApp.getPath('userData'), 'installed_apps');
        for (const m of manifests) {
            try {
                if (m.appPath && m.appPath.startsWith(userAppsDir) && (activeAppIds.has(m.id) || activeAppIds.has(m.folder))) {
                    thirdPartyApps.push({
                        id: m.id,
                        name: m.name || m.id,
                        version: m.version || '1.0.0',
                        folder: m.folder || m.id,
                        db: m.db || null
                    });
                }
            } catch (_) {}
        }

        const nodeIdentity = require('../../core/node_identity');
        const networkSession = require('../../networks/session/network_session');
        const effectiveNetworkName = (networkSession && networkSession.isActive() ? networkSession.descriptor()?.name : null) || nodeIdentity.getNetworkName() || '';
        res.json({
            status: 'ok',
            networkName: effectiveNetworkName,
            protocolVersion: 2,
            databases,
            apps: thirdPartyApps
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { handleCloneBundle };

