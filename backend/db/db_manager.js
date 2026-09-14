const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const SqlJsAdapter = require('./SqlJsAdapter');
const BackupManager = require('./backup_manager');
const DeveloperVault = require('../security/developer_vault');
const dbCrypto = require('./db_crypto');
const deviceKey = require('./device_key');
const cryptoWorker = require('./crypto_worker');
const { deriveKeyForPurpose } = require('../security/network_key_derivation');

const DEBOUNCE_MS = 600;
const BACKUP_THROTTLE_MS = 3600000;
const MIGRATION_MAP = {
    auth: '../migrations/auth',
    config: '../migrations/config',
    ledger: '../migrations/ledger',
    app: '../migrations/app_data',
    store: '../migrations/store',
    app_anagrafica: '../migrations/anagrafica',
    app_azienda: '../migrations/azienda',
    audit: '../migrations/audit'
};

class DatabaseManager {
    constructor() {
        this.databases = {
            config: null,
            auth: null,
            ledger: null,
            app: null,
            store: null,
            app_anagrafica: null,
            app_azienda: null,
            audit: null
        };
        this.deviceKey = null;
        this.basePath = null;
        this._explicitBasePath = null;
        this._dirtyDomains = new Set();
        this._writeTimers = new Map();
        this._lastBackupTimes = new Map();
        this._hookShutdown();
    }

    _hookShutdown() {
        try {
            if (app && typeof app.on === 'function') {
                app.on('before-quit', () => {
                    try {
                        this.flushAll();
                    } catch (_) {}
                });
            }
            if (typeof process !== 'undefined' && typeof process.on === 'function') {
                process.on('beforeExit', () => {
                    try {
                        this.flushAll();
                    } catch (_) {}
                });
            }
        } catch (_) {}
    }

    setWorkspace(absolutePath) {
        if (!absolutePath) return false;
        this._explicitBasePath = absolutePath;
        this.basePath = absolutePath;
        if (!fs.existsSync(this.basePath)) fs.mkdirSync(this.basePath, { recursive: true });
        return true;
    }

    setDeviceKey(keyHex) {
        if (typeof keyHex !== 'string' || keyHex.length !== 64) return false;
        this.deviceKey = keyHex;
        return true;
    }

    async openAll() {
        for (const [domain, migrationPath] of Object.entries(MIGRATION_MAP)) {
            await this.loadDatabase(domain, require(migrationPath));
        }
        return true;
    }

    closeAll() {
        this.flushAll();
        for (const domain of Object.keys(this.databases)) {
            const adapter = this.databases[domain];
            if (adapter && typeof adapter.disconnect === 'function') {
                try { adapter.disconnect(); } catch (_) {}
            }
            this.databases[domain] = null;
        }
        this._dirtyDomains.clear();
        this._lastBackupTimes.clear();
        this.deviceKey = null;
        return true;
    }

    initPaths() {
        try {
            if (this._explicitBasePath) {
                this.basePath = this._explicitBasePath;
                if (!fs.existsSync(this.basePath)) fs.mkdirSync(this.basePath, { recursive: true });
                return;
            }
            const activeNodeFile = path.join(app.getPath('userData'), 'active_node.json');
            let activeNode = 'default';
            if (fs.existsSync(activeNodeFile)) {
                try {
                    const data = JSON.parse(fs.readFileSync(activeNodeFile, 'utf8'));
                    if (data.node) activeNode = data.node;
                } catch (_) {}
            }
            this.basePath = path.join(app.getPath('userData'), 'dbs', activeNode);
            if (!fs.existsSync(this.basePath)) {
                fs.mkdirSync(this.basePath, { recursive: true });
            }
        } catch (_) {}
    }

    setActiveNode(nodeCode) {
        try {
            if (!nodeCode) return;
            const activeNodeFile = path.join(app.getPath('userData'), 'active_node.json');
            const safeNode = nodeCode.replace(/[^a-zA-Z0-9_-]/g, '');
            const dir = path.dirname(activeNodeFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(activeNodeFile, JSON.stringify({ node: safeNode }));
            const newBasePath = path.join(app.getPath('userData'), 'dbs', safeNode);
            if (this.basePath && this.basePath !== newBasePath) {
                if (fs.existsSync(this.basePath) && !fs.existsSync(newBasePath)) {
                    try { fs.renameSync(this.basePath, newBasePath); } catch (_) {}
                }
            }
            this.basePath = newBasePath;
            if (!fs.existsSync(this.basePath)) {
                fs.mkdirSync(this.basePath, { recursive: true });
            }
        } catch (_) {}
    }

    loadOrGenerateLocalDeviceKey(networkCode = null) {
        return deviceKey.loadOrGenerate(networkCode);
    }

    decryptBuffer(fileBuffer, keyHex) {
        return dbCrypto.decryptBuffer(fileBuffer, keyHex);
    }

    encryptBuffer(dataBuffer, keyHex) {
        return dbCrypto.encryptBuffer(dataBuffer, keyHex);
    }

    async loadDatabase(domain, migrations) {
        try {
            this.initPaths();
            const dbPath = path.join(this.basePath, `${domain}.enc`);
            const tmpPath = path.join(this.basePath, `${domain}.enc.tmp`);
            let decryptedData = null;
            let targetFile = dbPath;
            let fileExists = fs.existsSync(dbPath);
            if (fs.existsSync(tmpPath)) {
                if (!fileExists || fs.statSync(tmpPath).mtimeMs > fs.statSync(dbPath).mtimeMs) {
                    targetFile = tmpPath;
                    fileExists = true;
                }
            }
            if (fileExists) {
                try {
                    const fileBuffer = fs.readFileSync(targetFile);
                    decryptedData = this.decryptBuffer(fileBuffer, this.deviceKey);
                } catch (_) {}
                if (!decryptedData) {
                    const backupDir = path.join(this.basePath, 'backups', domain);
                    const fallbackPath = BackupManager.getLatestValidBackup(backupDir);
                    if (fallbackPath) {
                        try {
                            const fileBuffer = fs.readFileSync(fallbackPath);
                            decryptedData = this.decryptBuffer(fileBuffer, this.deviceKey);
                        } catch (_) {}
                    }
                }
                if (!decryptedData) {
                    throw new Error(`Impossibile decriptare il database esistente: ${domain}.enc`);
                }
            }
            const adapter = new SqlJsAdapter();
            const config = decryptedData ? { buffer: decryptedData } : null;
            await adapter.connect(config);
            try {
                const check = adapter.query('PRAGMA quick_check;');
                if (check && check.length > 0 && check[0].quick_check !== 'ok') {
                    throw new Error(`Corruzione rilevata in ${domain}`);
                }
            } catch (_) {}
            await adapter.runMigrations(migrations);
            this.databases[domain] = adapter;
            return true;
        } catch (e) {
            throw e;
        }
    }

    async _writeToDisk(domain) {
        try {
            if (!this.databases[domain] || !this.deviceKey || !this.basePath) return false;
            const dataBuffer = await this.databases[domain].exportData();
            const encryptedData = await cryptoWorker.cifra(dataBuffer, this.deviceKey);
            if (!encryptedData) return false;

            const dbPath = path.join(this.basePath, `${domain}.enc`);
            const tmpPath = path.join(this.basePath, `${domain}.enc.tmp`);
            const backupDir = path.join(this.basePath, 'backups', domain);

            try {
                const fd = fs.openSync(tmpPath, 'w');
                fs.writeSync(fd, encryptedData, 0, encryptedData.length, 0);
                try { fs.fsyncSync(fd); } catch (_) {}
                fs.closeSync(fd);
            } catch (_) {
                fs.writeFileSync(tmpPath, encryptedData);
            }

            let renameSuccess = false;
            let retries = 5;
            while (retries > 0 && !renameSuccess) {
                try {
                    fs.renameSync(tmpPath, dbPath);
                    renameSuccess = true;
                } catch (err) {
                    if (err.code === 'EBUSY' || err.code === 'EPERM') {
                        retries--;
                        if (retries === 0) {
                            try {
                                fs.copyFileSync(tmpPath, dbPath);
                                try { fs.unlinkSync(tmpPath); } catch (_) {}
                                renameSuccess = true;
                            } catch (_) {}
                        } else {
                            await new Promise(r => setTimeout(r, 50));
                        }
                    } else {
                        break;
                    }
                }
            }

            const now = Date.now();
            const lastBackup = this._lastBackupTimes.get(domain) || 0;
            if (now - lastBackup > BACKUP_THROTTLE_MS) {
                this._lastBackupTimes.set(domain, now);
                try { BackupManager.rotateDailyBackups(dbPath, backupDir); } catch (_) {}
                try { DeveloperVault.backupDatabase(domain, dbPath).catch(() => {}); } catch (_) {}
            }

            return true;
        } catch (_) {
            return false;
        }
    }

    async saveDatabase(domain, immediate = false) {
        try {
            if (!this.databases[domain]) return false;
            if (!this.deviceKey) return false;

            if (immediate) {
                if (this._writeTimers.has(domain)) {
                    clearTimeout(this._writeTimers.get(domain));
                    this._writeTimers.delete(domain);
                }
                this._dirtyDomains.delete(domain);
                return await this._writeToDisk(domain);
            }

            this._dirtyDomains.add(domain);
            if (this._writeTimers.has(domain)) {
                return true;
            }

            const timer = setTimeout(async () => {
                try {
                    this._writeTimers.delete(domain);
                    if (this._dirtyDomains.has(domain)) {
                        this._dirtyDomains.delete(domain);
                        await this._writeToDisk(domain);
                    }
                } catch (_) {}
            }, DEBOUNCE_MS);

            if (timer && typeof timer.unref === 'function') {
                timer.unref();
            }
            this._writeTimers.set(domain, timer);
            return true;
        } catch (_) {
            return false;
        }
    }

    async saveAll(immediate = false) {
        try {
            const promises = [];
            for (const domain of Object.keys(this.databases)) {
                if (this.databases[domain]) {
                    promises.push(this.saveDatabase(domain, immediate));
                }
            }
            await Promise.all(promises);
            return true;
        } catch (_) {
            return false;
        }
    }

    flushAll() {
        try {
            for (const [domain, timer] of this._writeTimers.entries()) {
                try { clearTimeout(timer); } catch (_) {}
            }
            this._writeTimers.clear();

            const dirty = [...this._dirtyDomains];
            this._dirtyDomains.clear();

            for (const domain of dirty) {
                try {
                    if (!this.databases[domain] || !this.deviceKey || !this.basePath) continue;
                    const dataBuffer = this.databases[domain].exportData();
                    const encryptedData = this.encryptBuffer(dataBuffer, this.deviceKey);
                    if (encryptedData) {
                        const dbPath = path.join(this.basePath, `${domain}.enc`);
                        fs.writeFileSync(dbPath, encryptedData);
                    }
                } catch (_) {}
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    getDB(domain) {
        if (!this.databases[domain]) {
            const err = new Error('DB_NOT_INITIALIZED');
            err.isExpected = true;
            throw err;
        }
        return this.databases[domain];
    }

    async unlock() {
        try {
            this.deviceKey = this.loadOrGenerateLocalDeviceKey();
            if (!this.deviceKey) return false;
            const mAuth = require('../migrations/auth');
            const mConfig = require('../migrations/config');
            const mLedger = require('../migrations/ledger');
            const mApp = require('../migrations/app_data');
            const mStore = require('../migrations/store');
            const mAnagrafica = require('../migrations/anagrafica');
            const mAzienda = require('../migrations/azienda');
            const mAudit = require('../migrations/audit');
            await this.loadDatabase('auth', mAuth);
            await this.loadDatabase('config', mConfig);
            await this.loadDatabase('ledger', mLedger);
            await this.loadDatabase('app', mApp);
            await this.loadDatabase('store', mStore);
            await this.loadDatabase('app_anagrafica', mAnagrafica);
            await this.loadDatabase('app_azienda', mAzienda);
            await this.loadDatabase('audit', mAudit);
            if (this.databases['config']) {
                const res = this.databases['config'].query("SELECT key_value FROM network_config WHERE key_name = 'network_code'");
                if (res && res.length > 0) {
                    const netCode = res[0].key_value;
                    const expectedKey = deriveKeyForPurpose(netCode, 'db-encryption');
                    if (this.deviceKey !== expectedKey) {
                        this.deviceKey = this.loadOrGenerateLocalDeviceKey(netCode);
                    }
                    const expectedHash = deriveKeyForPurpose(netCode, 'network-membership-hash');
                    const hashRes = this.databases['config'].query("SELECT key_value FROM network_config WHERE key_name = 'network_code_hash'");
                    const storedHash = (hashRes && hashRes.length > 0) ? hashRes[0].key_value : null;
                    if (storedHash !== expectedHash) {
                        this.databases['config'].execute("INSERT OR REPLACE INTO network_config (key_name, key_value) VALUES ('network_code_hash', ?)", [expectedHash]);
                    }
                }
            }
            await this.saveAll(true);
            return true;
        } catch (_) {
            return false;
        }
    }

    async reset() {
        try {
            this.initPaths();
            const files = fs.readdirSync(this.basePath);
            for (const f of files) {
                if (f.endsWith('.enc') || f.endsWith('.tmp')) {
                    try { fs.unlinkSync(path.join(this.basePath, f)); } catch (_) {}
                }
            }
            this.databases = {
                config: null,
                auth: null,
                ledger: null,
                app: null,
                store: null,
                app_anagrafica: null,
                app_azienda: null,
                audit: null
            };
            return true;
        } catch (_) {
            return false;
        }
    }

    isRegistered() {
        try {
            this.initPaths();
            return fs.existsSync(path.join(this.basePath, 'auth.enc')) || fs.existsSync(path.join(this.basePath, 'config.enc'));
        } catch (_) {
            return false;
        }
    }
}

const instance = new DatabaseManager();
module.exports = instance;
