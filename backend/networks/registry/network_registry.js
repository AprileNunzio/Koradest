'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vault = require('./network_vault');
const identity = require('./network_identity');

const ROLES = ['owner', 'member'];

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _workspaceRoot() {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'dbs');
}

function workspacePathOf(entry) {
    if (!entry || typeof entry.slug !== 'string' || entry.slug.length === 0) throw _expected('NETWORK_SLUG_INVALID');
    const safe = entry.slug.replace(/[^a-zA-Z0-9_-]/g, '');
    if (safe.length === 0) throw _expected('NETWORK_SLUG_INVALID');
    return path.join(_workspaceRoot(), safe);
}

function list() {
    return vault.read().networks.slice().sort((a, b) => (b.lastAccessAt || 0) - (a.lastAccessAt || 0));
}

function getById(id) {
    return list().find(n => n.id === id) || null;
}

function findByPublicId(publicId) {
    return list().find(n => n.publicId === publicId) || null;
}

function _persist(networks) {
    return vault.write({ version: 1, networks });
}

function create({ name, code, role = 'member', remember = false, slugOverride = null, autoStart = null }) {
    const ident = identity.identityOf(code);
    const existing = findByPublicId(ident.publicId);
    if (existing) throw _expected('NETWORK_ALREADY_REGISTERED');
    const cleanName = identity.sanitizeName(name) || 'Rete Koradest';
    const entry = {
        id: crypto.randomUUID(),
        name: cleanName,
        publicId: ident.publicId,
        slug: slugOverride || ident.slug,
        membershipHash: ident.membershipHash,
        sealedCode: remember ? vault.sealSecret(ident.code) : null,
        autoStart: autoStart === null ? remember === true : autoStart === true,
        role: ROLES.includes(role) ? role : 'member',
        color: identity.colorOf(ident.publicId),
        createdAt: Date.now(),
        lastAccessAt: 0
    };
    const networks = list();
    networks.push(entry);
    if (!_persist(networks)) throw _expected('NETWORK_VAULT_WRITE_FAILED');
    return entry;
}

function update(id, mutator) {
    const networks = list();
    const index = networks.findIndex(n => n.id === id);
    if (index === -1) throw _expected('NETWORK_NOT_FOUND');
    const next = { ...networks[index], ...mutator(networks[index]) };
    networks[index] = next;
    if (!_persist(networks)) throw _expected('NETWORK_VAULT_WRITE_FAILED');
    return next;
}

function rename(id, name) {
    const cleanName = identity.sanitizeName(name);
    if (!cleanName) throw _expected('NETWORK_NAME_INVALID');
    return update(id, () => ({ name: cleanName }));
}

function touch(id) {
    return update(id, () => ({ lastAccessAt: Date.now() }));
}

function setRole(id, role) {
    if (!ROLES.includes(role)) throw _expected('NETWORK_ROLE_INVALID');
    return update(id, () => ({ role }));
}

function verifyCode(entry, rawCode) {
    if (!entry) return false;
    try {
        return identity.identityOf(rawCode).publicId === entry.publicId;
    } catch (_) {
        return false;
    }
}

function resolveStoredCode(entry) {
    if (!entry || !entry.sealedCode) return null;
    const plain = vault.unsealSecret(entry.sealedCode);
    if (!plain || !verifyCode(entry, plain)) return null;
    return identity.normalizeCode(plain);
}

function setRememberCode(id, rawCode, remember) {
    const entry = getById(id);
    if (!entry) throw _expected('NETWORK_NOT_FOUND');
    if (!remember) return update(id, () => ({ sealedCode: null }));
    if (!verifyCode(entry, rawCode)) throw _expected('NETWORK_CODE_MISMATCH');
    const sealed = vault.sealSecret(identity.normalizeCode(rawCode));
    if (!sealed) throw _expected('NETWORK_SEAL_UNAVAILABLE');
    return update(id, () => ({ sealedCode: sealed }));
}

function _purgeWorkspace(entry) {
    const target = workspacePathOf(entry);
    const root = _workspaceRoot();
    if (!target.startsWith(root + path.sep)) throw _expected('NETWORK_PATH_OUT_OF_SCOPE');
    if (!fs.existsSync(target)) return true;
    fs.rmSync(target, { recursive: true, force: true });
    return true;
}

function remove(id, { rawCode, purgeData }) {
    const entry = getById(id);
    if (!entry) throw _expected('NETWORK_NOT_FOUND');
    if (!verifyCode(entry, rawCode)) throw _expected('NETWORK_CODE_MISMATCH');
    if (purgeData) _purgeWorkspace(entry);
    const networks = list().filter(n => n.id !== id);
    if (!_persist(networks)) throw _expected('NETWORK_VAULT_WRITE_FAILED');
    return true;
}

module.exports = {
    ROLES,
    list,
    getById,
    findByPublicId,
    create,
    update,
    rename,
    touch,
    setRole,
    verifyCode,
    resolveStoredCode,
    setRememberCode,
    remove,
    workspacePathOf
};
