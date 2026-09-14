'use strict';
const shamir = require('./shamir');
const codec = require('./share_codec');
const identity = require('../registry/network_identity');

const QUOTE_MIN = 2;
const QUOTE_MAX = 12;

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _valida(totalShares, threshold) {
    if (!Number.isInteger(totalShares) || totalShares < QUOTE_MIN || totalShares > QUOTE_MAX) {
        throw _expected('RECOVERY_TOTAL_INVALID');
    }
    if (!Number.isInteger(threshold) || threshold < QUOTE_MIN || threshold > totalShares) {
        throw _expected('RECOVERY_THRESHOLD_INVALID');
    }
}

function createKit(rawCode, { totalShares, threshold }) {
    _valida(totalShares, threshold);
    const ident = identity.identityOf(rawCode);
    const segreto = Buffer.from(ident.code.replace(/-/g, ''), 'utf8');
    const quote = shamir.split(segreto, totalShares, threshold);
    return {
        publicId: ident.publicId,
        threshold,
        totalShares,
        createdAt: Date.now(),
        shares: quote.map(q => codec.encodeShare(ident.publicId, q))
    };
}

function inspectShares(testi) {
    const lette = [];
    const errori = [];
    for (const testo of testi) {
        if (!testo || !String(testo).trim()) continue;
        try {
            lette.push(codec.decodeShare(testo));
        } catch (e) {
            errori.push({ testo: String(testo).slice(0, 24), codice: e.message });
        }
    }
    const riferimenti = new Set(lette.map(q => q.publicIdCorto));
    const reteCoerente = riferimenti.size <= 1;
    const distinte = [];
    const visti = new Set();
    for (const quota of lette) {
        if (visti.has(quota.index)) continue;
        visti.add(quota.index);
        distinte.push(quota);
    }
    return { quote: distinte, errori, reteCoerente, riferimento: distinte.length > 0 ? distinte[0].publicIdCorto : null };
}

function restore(testi) {
    const { quote, errori, reteCoerente } = inspectShares(testi);
    if (!reteCoerente) throw _expected('RECOVERY_SHARES_MIXED');
    if (quote.length < QUOTE_MIN) {
        const err = _expected('RECOVERY_NOT_ENOUGH_SHARES');
        err.dettagli = errori;
        throw err;
    }
    const segreto = shamir.combine(quote.map(q => ({ index: q.index, data: q.data })));
    const testo = segreto.toString('utf8');
    if (!identity.isValidCode(testo)) throw _expected('RECOVERY_SHARES_INSUFFICIENT');
    const ident = identity.identityOf(testo);
    if (quote[0].publicIdCorto !== ident.publicId.slice(0, 8).toUpperCase()) {
        throw _expected('RECOVERY_SHARES_INSUFFICIENT');
    }
    return { code: ident.code, publicId: ident.publicId };
}

module.exports = { createKit, restore, inspectShares, QUOTE_MIN, QUOTE_MAX };
