'use strict';
const identity = require('../registry/network_identity');
const bus = require('../../core/event_bus');

let _active = null;

function activate(entry, rawCode) {
    const ident = identity.identityOf(rawCode);
    if (ident.publicId !== entry.publicId) {
        const err = new Error('NETWORK_CODE_MISMATCH');
        err.isExpected = true;
        throw err;
    }
    _active = {
        networkId: entry.id,
        name: entry.name,
        slug: entry.slug,
        role: entry.role,
        color: entry.color,
        publicId: ident.publicId,
        membershipHash: ident.membershipHash,
        dbKey: ident.dbKey,
        code: ident.code,
        activatedAt: Date.now()
    };
    bus.publish('network:activated', descriptor());
    return _active;
}

function clear() {
    if (!_active) return false;
    const previous = descriptor();
    _active = null;
    identity.purgeCache();
    bus.publish('network:deactivated', previous);
    return true;
}

function isActive() {
    return _active !== null;
}

function getActiveCode() {
    return _active ? _active.code : null;
}

function getActiveDbKey() {
    return _active ? _active.dbKey : null;
}

function getActivePublicId() {
    return _active ? _active.publicId : null;
}

function getActiveMembershipHash() {
    return _active ? _active.membershipHash : null;
}

function getActiveSlug() {
    return _active ? _active.slug : null;
}

function getActiveId() {
    return _active ? _active.networkId : null;
}

function descriptor() {
    if (!_active) return null;
    return {
        networkId: _active.networkId,
        name: _active.name,
        publicId: _active.publicId,
        role: _active.role,
        color: _active.color,
        activatedAt: _active.activatedAt
    };
}

module.exports = {
    activate,
    clear,
    isActive,
    getActiveCode,
    getActiveDbKey,
    getActivePublicId,
    getActiveMembershipHash,
    getActiveSlug,
    getActiveId,
    descriptor
};
