'use strict';
const crypto = require('crypto');

const FIELD_SIZE = 256;
const GENERATOR = 0x03;
const REDUCING_POLYNOMIAL = 0x11b;
const MAX_SHARES = 255;

const EXP = new Uint8Array(FIELD_SIZE * 2);
const LOG = new Uint8Array(FIELD_SIZE);

(function buildTables() {
    let value = 1;
    for (let i = 0; i < FIELD_SIZE - 1; i++) {
        EXP[i] = value;
        LOG[value] = i;
        value ^= (value << 1) & 0xff;
        if ((EXP[i] << 1) & 0x100) value ^= (REDUCING_POLYNOMIAL & 0xff);
    }
    for (let i = FIELD_SIZE - 1; i < EXP.length; i++) EXP[i] = EXP[i - (FIELD_SIZE - 1)];
})();

function mul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
}

function div(a, b) {
    if (b === 0) throw new Error('SHAMIR_DIVISION_BY_ZERO');
    if (a === 0) return 0;
    return EXP[LOG[a] + (FIELD_SIZE - 1) - LOG[b]];
}

function _evaluate(coefficients, x) {
    let result = 0;
    for (let i = coefficients.length - 1; i >= 0; i--) {
        result = mul(result, x) ^ coefficients[i];
    }
    return result;
}

function split(secret, totalShares, threshold) {
    if (!Buffer.isBuffer(secret) || secret.length === 0) throw new Error('SHAMIR_SECRET_INVALID');
    if (!Number.isInteger(totalShares) || totalShares < 2 || totalShares > MAX_SHARES) throw new Error('SHAMIR_TOTAL_INVALID');
    if (!Number.isInteger(threshold) || threshold < 2 || threshold > totalShares) throw new Error('SHAMIR_THRESHOLD_INVALID');

    const shares = [];
    for (let i = 1; i <= totalShares; i++) shares.push({ index: i, data: Buffer.alloc(secret.length) });

    for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
        const coefficients = new Uint8Array(threshold);
        coefficients[0] = secret[byteIndex];
        const random = crypto.randomBytes(threshold - 1);
        for (let c = 1; c < threshold; c++) coefficients[c] = random[c - 1];
        if (coefficients[threshold - 1] === 0) coefficients[threshold - 1] = 1 + crypto.randomInt(0, 255);
        for (const share of shares) {
            share.data[byteIndex] = _evaluate(coefficients, share.index);
        }
    }
    return shares;
}

function combine(shares) {
    if (!Array.isArray(shares) || shares.length < 2) throw new Error('SHAMIR_NOT_ENOUGH_SHARES');
    const length = shares[0].data.length;
    const visti = new Set();
    for (const share of shares) {
        if (!share || !Number.isInteger(share.index) || share.index < 1 || share.index > MAX_SHARES) throw new Error('SHAMIR_SHARE_INVALID');
        if (!Buffer.isBuffer(share.data) || share.data.length !== length) throw new Error('SHAMIR_SHARE_LENGTH_MISMATCH');
        if (visti.has(share.index)) throw new Error('SHAMIR_DUPLICATE_SHARE');
        visti.add(share.index);
    }

    const secret = Buffer.alloc(length);
    for (let byteIndex = 0; byteIndex < length; byteIndex++) {
        let accumulator = 0;
        for (let i = 0; i < shares.length; i++) {
            let numerator = 1;
            let denominator = 1;
            for (let j = 0; j < shares.length; j++) {
                if (i === j) continue;
                numerator = mul(numerator, shares[j].index);
                denominator = mul(denominator, shares[i].index ^ shares[j].index);
            }
            const lagrange = div(numerator, denominator);
            accumulator ^= mul(lagrange, shares[i].data[byteIndex]);
        }
        secret[byteIndex] = accumulator;
    }
    return secret;
}

module.exports = { split, combine, mul, div, MAX_SHARES };
