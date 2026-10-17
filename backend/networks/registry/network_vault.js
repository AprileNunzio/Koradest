'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;
const VAULT_FILE = 'networks.vault';
const KEY_FILE = 'networks.vault.key';
const EMPTY_VAULT = { version: 1, networks: [] };

let _keyCache = null;

function _userDataDir() {
    const { app } = require('electron');
    return app.getPath('userData');
}

function _vaultPath() {
    return path.join(_userDataDir(), VAULT_FILE);
}

function _keyPath() {
    return path.join(_userDataDir(), KEY_FILE);
}

function _safeStorage() {
    try {
        const { safeStorage } = require('electron');
        if (safeStorage && safeStorage.isEncryptionAvailable()) return safeStorage;
        return null;
    } catch (_) {
        return null;
    }
}

function _loadOrCreateKey() {
    try {
        if (_keyCache) return _keyCache;
        const store = _safeStorage();
        const keyPath = _keyPath();
        const bakPath = `${keyPath}.bak`;
        if (store && fs.existsSync(keyPath)) {
            try {
                const plain = store.decryptString(fs.readFileSync(keyPath));
                if (plain && plain.length === 64) {
                    _keyCache = Buffer.from(plain, 'hex');
                    try {
                        if (!fs.existsSync(bakPath)) fs.copyFileSync(keyPath, bakPath);
                    } catch (_) {}
                    return _keyCache;
                }
            } catch (_) {}
        }
        if (store && fs.existsSync(bakPath)) {
            try {
                const plain = store.decryptString(fs.readFileSync(bakPath));
                if (plain && plain.length === 64) {
                    _keyCache = Buffer.from(plain, 'hex');
                    try {
                        fs.copyFileSync(bakPath, keyPath);
                    } catch (_) {}
                    return _keyCache;
                }
            } catch (_) {}
        }
        if (fs.existsSync(keyPath)) {
            try {
                if (!fs.existsSync(bakPath)) fs.copyFileSync(keyPath, bakPath);
            } catch (_) {}
        }
        const generated = crypto.randomBytes(32);
        if (store) {
            try {
                const dir = path.dirname(keyPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(keyPath, store.encryptString(generated.toString('hex')));
            } catch (_) {}
        }
        _keyCache = generated;
        return _keyCache;
    } catch (_) {
        return crypto.randomBytes(32);
    }
}

function _decrypt(buffer, key) {
    try {
        if (buffer.length < IV_LEN + TAG_LEN) return null;
        const decipher = crypto.createDecipheriv(ALGO, key, buffer.subarray(0, IV_LEN));
        decipher.setAuthTag(buffer.subarray(IV_LEN, IV_LEN + TAG_LEN));
        const plain = Buffer.concat([decipher.update(buffer.subarray(IV_LEN + TAG_LEN)), decipher.final()]);
        return JSON.parse(plain.toString('utf8'));
    } catch (_) {
        return null;
    }
}

function _encrypt(payload, key) {
    try {
        const iv = crypto.randomBytes(IV_LEN);
        const cipher = crypto.createCipheriv(ALGO, key, iv);
        const body = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload), 'utf8')), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), body]);
    } catch (e) {
        throw e;
    }
}

function _normalize(vault) {
    try {
        if (!vault || typeof vault !== 'object' || !Array.isArray(vault.networks)) return { ...EMPTY_VAULT };
        return { version: vault.version || 1, networks: vault.networks };
    } catch (_) {
        return { ...EMPTY_VAULT };
    }
}

function exists() {
    try {
        return fs.existsSync(_vaultPath());
    } catch (_) {
        return false;
    }
}

function read() {
    try {
        const file = _vaultPath();
        const bak = `${file}.bak`;
        if (fs.existsSync(file)) {
            try {
                const decrypted = _decrypt(fs.readFileSync(file), _loadOrCreateKey());
                if (decrypted) return _normalize(decrypted);
            } catch (_) {}
        }
        if (fs.existsSync(bak)) {
            try {
                const decryptedBak = _decrypt(fs.readFileSync(bak), _loadOrCreateKey());
                if (decryptedBak) return _normalize(decryptedBak);
            } catch (_) {}
        }
        return { ...EMPTY_VAULT };
    } catch (_) {
        return { ...EMPTY_VAULT };
    }
}

function write(vault) {
    try {
        const file = _vaultPath();
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const tmp = `${file}.tmp`;
        const bak = `${file}.bak`;
        const encrypted = _encrypt(_normalize(vault), _loadOrCreateKey());
        fs.writeFileSync(tmp, encrypted);
        try {
            if (fs.existsSync(file)) fs.copyFileSync(file, bak);
        } catch (_) {}
        fs.renameSync(tmp, file);
        return true;
    } catch (_) {
        return false;
    }
}

function sealSecret(plain) {
    const store = _safeStorage();
    if (!store || typeof plain !== 'string' || plain.length === 0) return null;
    try {
        return store.encryptString(plain).toString('base64');
    } catch (_) {
        return null;
    }
}

function unsealSecret(sealed) {
    const store = _safeStorage();
    if (!store || typeof sealed !== 'string' || sealed.length === 0) return null;
    try {
        return store.decryptString(Buffer.from(sealed, 'base64'));
    } catch (_) {
        return null;
    }
}

module.exports = { exists, read, write, sealSecret, unsealSecret };
