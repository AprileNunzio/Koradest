'use strict';
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;

function decryptBuffer(fileBuffer, keyHex) {
    try {
        if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length < IV_LEN + AUTH_TAG_LEN) return null;
        const key = Buffer.from(keyHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGO, key, fileBuffer.subarray(0, IV_LEN));
        decipher.setAuthTag(fileBuffer.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN));
        const head = decipher.update(fileBuffer.subarray(IV_LEN + AUTH_TAG_LEN));
        return Buffer.concat([head, decipher.final()]);
    } catch (_) {
        return null;
    }
}

function encryptBuffer(dataBuffer, keyHex) {
    try {
        const key = Buffer.from(keyHex, 'hex');
        const iv = crypto.randomBytes(IV_LEN);
        const cipher = crypto.createCipheriv(ALGO, key, iv);
        const body = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), body]);
    } catch (_) {
        return null;
    }
}

module.exports = { ALGO, IV_LEN, AUTH_TAG_LEN, decryptBuffer, encryptBuffer };
