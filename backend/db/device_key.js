'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { deriveKeyForPurpose } = require('../security/network_key_derivation');

const LEGACY_KEY_FILE = 'device.key';

function _keyPath() {
    return path.join(app.getPath('userData'), LEGACY_KEY_FILE);
}

function _store() {
    try {
        const { safeStorage } = require('electron');
        if (safeStorage && safeStorage.isEncryptionAvailable()) return safeStorage;
        return null;
    } catch (_) {
        return null;
    }
}

function _seal(keyHex) {
    const store = _store();
    if (!store) return false;
    try {
        const target = _keyPath();
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(target, store.encryptString(keyHex));
        return true;
    } catch (_) {
        return false;
    }
}

function fromNetworkCode(networkCode) {
    const derived = deriveKeyForPurpose(networkCode, 'db-encryption');
    _seal(derived);
    return derived;
}

function loadSealed() {
    const store = _store();
    const target = _keyPath();
    if (!store || !fs.existsSync(target)) return null;
    try {
        const plain = store.decryptString(fs.readFileSync(target));
        return plain || null;
    } catch (_) {
        return null;
    }
}

function loadOrGenerate(networkCode = null) {
    try {
        if (networkCode) return fromNetworkCode(networkCode);
        const sealed = loadSealed();
        if (sealed) return sealed;
        const fallback = crypto.randomBytes(32).toString('hex');
        _seal(fallback);
        return fallback;
    } catch (_) {
        return null;
    }
}

module.exports = { fromNetworkCode, loadSealed, loadOrGenerate };
