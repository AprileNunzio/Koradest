'use strict';
const path = require('path');
const { Worker } = require('worker_threads');

const SCRIPT = path.join(__dirname, 'crypto_worker_script.js');
const ATTESA_MASSIMA_MS = 30000;

let _worker = null;
let _prossimoId = 1;
const _inAttesa = new Map();
let _disponibile = true;

function _rifiutaTutte(motivo) {
    for (const [, richiesta] of _inAttesa) {
        clearTimeout(richiesta.scadenza);
        richiesta.rifiuta(new Error(motivo));
    }
    _inAttesa.clear();
}

function _avvia() {
    if (_worker || !_disponibile) return _worker;
    try {
        _worker = new Worker(SCRIPT);
        _worker.unref();
        _worker.on('message', (messaggio) => {
            const richiesta = _inAttesa.get(messaggio.id);
            if (!richiesta) return;
            _inAttesa.delete(messaggio.id);
            clearTimeout(richiesta.scadenza);
            if (messaggio.ok) richiesta.risolvi(messaggio.risultato);
            else richiesta.rifiuta(new Error(messaggio.errore));
        });
        _worker.on('error', (errore) => {
            console.error('[CryptoWorker] Errore nel thread crittografico:', errore.message);
            _worker = null;
            _rifiutaTutte('Thread crittografico terminato');
        });
        _worker.on('exit', () => {
            _worker = null;
            _rifiutaTutte('Thread crittografico chiuso');
        });
        return _worker;
    } catch (errore) {
        console.error('[CryptoWorker] Avvio non riuscito, si procede sul thread principale:', errore.message);
        _disponibile = false;
        _worker = null;
        return null;
    }
}

function _invia(operazione, payload) {
    const worker = _avvia();
    if (!worker) return Promise.reject(new Error('Thread crittografico non disponibile'));
    const id = _prossimoId++;
    return new Promise((risolvi, rifiuta) => {
        const scadenza = setTimeout(() => {
            _inAttesa.delete(id);
            rifiuta(new Error('Timeout del thread crittografico'));
        }, ATTESA_MASSIMA_MS);
        _inAttesa.set(id, { risolvi, rifiuta, scadenza });
        worker.postMessage({ id, operazione, payload });
    });
}

async function cifra(dati, chiaveHex) {
    const dbCrypto = require('./db_crypto');
    try {
        const esito = await _invia('cifra', { dati, chiave: chiaveHex });
        return Buffer.from(esito);
    } catch (errore) {
        console.warn('[CryptoWorker] Cifratura sul thread principale:', errore.message);
        return dbCrypto.encryptBuffer(dati, chiaveHex);
    }
}

async function decifra(dati, chiaveHex) {
    const dbCrypto = require('./db_crypto');
    try {
        const esito = await _invia('decifra', { dati, chiave: chiaveHex });
        return esito ? Buffer.from(esito) : null;
    } catch (errore) {
        console.warn('[CryptoWorker] Decifratura sul thread principale:', errore.message);
        return dbCrypto.decryptBuffer(dati, chiaveHex);
    }
}

async function derivaChiave(codice) {
    try {
        return await _invia('derivaChiave', { codice });
    } catch (errore) {
        console.warn('[CryptoWorker] Derivazione sul thread principale:', errore.message);
        return require('../security/network_key_derivation').deriveMasterKey(codice);
    }
}

function chiudi() {
    if (!_worker) return false;
    const worker = _worker;
    _worker = null;
    _rifiutaTutte('Thread crittografico chiuso su richiesta');
    worker.terminate().catch(() => {});
    return true;
}

module.exports = { cifra, decifra, derivaChiave, chiudi };
