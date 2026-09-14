const path = require('path');
const crypto = require('crypto');
const worker = require(path.resolve('backend/db/crypto_worker'));
const dbCrypto = require(path.resolve('backend/db/db_crypto'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

(async () => {
    const chiave = crypto.randomBytes(32).toString('hex');
    const dati = crypto.randomBytes(256 * 1024);

    const cifrato = await worker.cifra(dati, chiave);
    check('il thread cifra e restituisce un buffer', Buffer.isBuffer(cifrato) && cifrato.length > dati.length);
    check('il cifrato non contiene il testo in chiaro', cifrato.indexOf(dati.subarray(0, 64)) === -1);

    const decifrato = await worker.decifra(cifrato, chiave);
    check('il ciclo cifra e decifra restituisce i dati originali', decifrato.equals(dati));

    const compatibile = dbCrypto.decryptBuffer(cifrato, chiave);
    check('il formato e compatibile con la decifratura sincrona esistente', compatibile && compatibile.equals(dati));
    const inverso = await worker.decifra(dbCrypto.encryptBuffer(dati, chiave), chiave);
    check('il thread decifra cio che ha cifrato il percorso sincrono', inverso.equals(dati));

    const chiaveSbagliata = crypto.randomBytes(32).toString('hex');
    const esito = await worker.decifra(cifrato, chiaveSbagliata);
    check('una chiave errata non decifra', esito === null);

    const derivata = await worker.derivaChiave('K7M-P4Q-R2X');
    const attesa = require(path.resolve('backend/security/network_key_derivation')).deriveMasterKey('K7M-P4Q-R2X');
    check('la derivazione nel thread coincide con quella sincrona', derivata === attesa);
    check('la derivazione ignora trattini e minuscole', (await worker.derivaChiave('k7mp4qr2x')) === attesa);

    const inizio = Date.now();
    const molte = await Promise.all(Array.from({ length: 8 }, () => worker.cifra(dati, chiave)));
    check('gestisce piu richieste in parallelo', molte.every(m => Buffer.isBuffer(m) && m.length > 0));
    console.log(`       (8 cifrature da 256 KB in ${Date.now() - inizio} ms)`);

    worker.chiudi();
    const dopoChiusura = await worker.cifra(dati, chiave);
    check('dopo la chiusura ricade sul percorso sincrono senza errori', Buffer.isBuffer(dopoChiusura));
    const verificaRicaduta = dbCrypto.decryptBuffer(dopoChiusura, chiave);
    check('anche la ricaduta produce un cifrato valido', verificaRicaduta && verificaRicaduta.equals(dati));
    worker.chiudi();

    console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
    process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('ERRORE:', e); process.exit(1); });
