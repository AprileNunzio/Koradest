'use strict';
const { parentPort } = require('worker_threads');
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;
const SCRYPT_SALT = 'koradest-network-key-v1';
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

function cifra(dati, chiaveHex) {
    const chiave = Buffer.from(chiaveHex, 'hex');
    const iv = crypto.randomBytes(IV_LEN);
    const cifratore = crypto.createCipheriv(ALGO, chiave, iv);
    const corpo = Buffer.concat([cifratore.update(dati), cifratore.final()]);
    return Buffer.concat([iv, cifratore.getAuthTag(), corpo]);
}

function decifra(dati, chiaveHex) {
    if (dati.length < IV_LEN + AUTH_TAG_LEN) return null;
    const chiave = Buffer.from(chiaveHex, 'hex');
    const decifratore = crypto.createDecipheriv(ALGO, chiave, dati.subarray(0, IV_LEN));
    decifratore.setAuthTag(dati.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN));
    const testa = decifratore.update(dati.subarray(IV_LEN + AUTH_TAG_LEN));
    return Buffer.concat([testa, decifratore.final()]);
}

function derivaChiave(codice) {
    const normalizzato = String(codice).replace(/-/g, '').toUpperCase();
    return crypto.scryptSync(normalizzato, SCRYPT_SALT, 32, SCRYPT_OPTS).toString('hex');
}

parentPort.on('message', (messaggio) => {
    const { id, operazione, payload } = messaggio;
    try {
        let risultato = null;
        if (operazione === 'cifra') {
            risultato = cifra(Buffer.from(payload.dati), payload.chiave);
        } else if (operazione === 'decifra') {
            risultato = decifra(Buffer.from(payload.dati), payload.chiave);
        } else if (operazione === 'derivaChiave') {
            risultato = derivaChiave(payload.codice);
        } else {
            throw new Error('Operazione non supportata: ' + operazione);
        }
        parentPort.postMessage({ id, ok: true, risultato });
    } catch (errore) {
        parentPort.postMessage({ id, ok: false, errore: errore.message });
    }
});
