'use strict';
const crypto = require('crypto');

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFISSO = 'ADR1';
const GRUPPO = 4;

function _pulisci(testo) {
    return String(testo || '')
        .toUpperCase()
        .replace(/[IL]/g, '1')
        .replace(/O/g, '0')
        .replace(/U/g, 'V')
        .replace(/[^0-9A-Z]/g, '');
}

function encodeBase32(buffer) {
    let bits = 0;
    let valore = 0;
    let uscita = '';
    for (const byte of buffer) {
        valore = (valore << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            uscita += ALFABETO[(valore >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) uscita += ALFABETO[(valore << (5 - bits)) & 31];
    return uscita;
}

function decodeBase32(testo, lunghezzaAttesa) {
    let bits = 0;
    let valore = 0;
    const byte = [];
    for (const carattere of testo) {
        const indice = ALFABETO.indexOf(carattere);
        if (indice === -1) throw new Error('SHARE_CHARACTER_INVALID');
        valore = (valore << 5) | indice;
        bits += 5;
        if (bits >= 8) {
            byte.push((valore >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    const buffer = Buffer.from(byte);
    if (lunghezzaAttesa && buffer.length !== lunghezzaAttesa) throw new Error('SHARE_LENGTH_INVALID');
    return buffer;
}

function _checksum(publicIdCorto, indice, dati) {
    const digest = crypto.createHash('sha256')
        .update(publicIdCorto)
        .update(String(indice))
        .update(dati)
        .digest();
    return encodeBase32(digest.subarray(0, 3)).slice(0, 4);
}

function _raggruppa(testo) {
    return (testo.match(new RegExp(`.{1,${GRUPPO}}`, 'g')) || []).join('-');
}

function encodeShare(publicId, share) {
    const corto = String(publicId).slice(0, 8).toUpperCase();
    const dati = encodeBase32(share.data);
    const indice = share.index.toString(32).toUpperCase().padStart(2, '0');
    const controllo = _checksum(corto, share.index, share.data);
    return `${PREFISSO}-${corto}-${indice}-${_raggruppa(dati)}-${controllo}`;
}

function decodeShare(testo) {
    const grezzo = _pulisci(testo);
    if (!grezzo.startsWith(PREFISSO)) throw new Error('SHARE_PREFIX_INVALID');
    const corpo = grezzo.slice(PREFISSO.length);
    if (corpo.length < 8 + 2 + 4 + 1) throw new Error('SHARE_TOO_SHORT');
    const publicIdCorto = corpo.slice(0, 8);
    const indice = parseInt(corpo.slice(8, 10), 32);
    if (!Number.isInteger(indice) || indice < 1 || indice > 255) throw new Error('SHARE_INDEX_INVALID');
    const controlloAtteso = corpo.slice(-4);
    const datiBase32 = corpo.slice(10, -4);
    const data = decodeBase32(datiBase32);
    if (_checksum(publicIdCorto, indice, data) !== controlloAtteso) throw new Error('SHARE_CHECKSUM_INVALID');
    return { publicIdCorto, index: indice, data };
}

module.exports = { encodeShare, decodeShare, encodeBase32, decodeBase32, PREFISSO };
