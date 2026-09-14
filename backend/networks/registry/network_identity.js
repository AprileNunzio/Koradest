'use strict';
const { deriveMasterKey, deriveSubkey } = require('../../security/network_key_derivation');

const MIN_CODE_LEN = 5;
const MAX_CODE_LEN = 64;
const CACHE_MAX = 8;
const _cache = new Map();

const PALETTE = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
    '#10B981', '#06B6D4', '#EF4444', '#84CC16'
];

function normalizeCode(raw) {
    if (typeof raw !== 'string') return '';
    const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < MIN_CODE_LEN || clean.length > MAX_CODE_LEN) return '';
    if (clean.length === 9) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    return clean;
}

function isValidCode(raw) {
    return normalizeCode(raw) !== '';
}

function invalidCodeError() {
    const err = new Error('NETWORK_CODE_INVALID');
    err.isExpected = true;
    return err;
}

function identityOf(rawCode) {
    const code = normalizeCode(rawCode);
    if (!code) throw invalidCodeError();
    const cached = _cache.get(code);
    if (cached) return cached;
    const master = deriveMasterKey(code);
    const publicId = deriveSubkey(master, 'network-public-id').slice(0, 32);
    const identity = Object.freeze({
        code,
        publicId,
        slug: `net-${publicId.slice(0, 16)}`,
        membershipHash: deriveSubkey(master, 'network-membership-hash'),
        dbKey: deriveSubkey(master, 'db-encryption')
    });
    if (_cache.size >= CACHE_MAX) _cache.delete(_cache.keys().next().value);
    _cache.set(code, identity);
    return identity;
}

function publicIdOf(rawCode) {
    return identityOf(rawCode).publicId;
}

function matchesPublicId(rawCode, publicId) {
    if (typeof publicId !== 'string' || publicId.length !== 32) return false;
    return identityOf(rawCode).publicId === publicId;
}

function purgeCache() {
    _cache.clear();
}

function sanitizeName(raw) {
    if (typeof raw !== 'string') return '';
    return raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 60);
}

function colorOf(publicId) {
    if (typeof publicId !== 'string' || publicId.length === 0) return PALETTE[0];
    const index = parseInt(publicId.slice(0, 2), 16) % PALETTE.length;
    return PALETTE[Number.isNaN(index) ? 0 : index];
}

module.exports = {
    normalizeCode,
    isValidCode,
    invalidCodeError,
    identityOf,
    publicIdOf,
    matchesPublicId,
    purgeCache,
    sanitizeName,
    colorOf,
    PALETTE
};
