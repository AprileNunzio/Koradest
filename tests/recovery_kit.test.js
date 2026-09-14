const path = require('path');
const kit = require(path.resolve('backend/networks/recovery/recovery_kit'));
const codec = require(path.resolve('backend/networks/recovery/share_codec'));
const identity = require(path.resolve('backend/networks/registry/network_identity'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const errore = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };

const codice = 'K7M-P4Q-R2X';
const prodotto = kit.createKit(codice, { totalShares: 5, threshold: 3 });

check('genera il numero di quote richiesto', prodotto.shares.length === 5);
check('registra soglia e totale', prodotto.threshold === 3 && prodotto.totalShares === 5);
check('nessuna quota contiene il codice in chiaro', !prodotto.shares.some(s => s.replace(/-/g, '').includes('K7MP4QR2X')));
check('le quote iniziano con il prefisso riconoscibile', prodotto.shares.every(s => s.startsWith('ADR1-')));

const tre = prodotto.shares.slice(0, 3);
check('tre quote su cinque ricostruiscono il codice', kit.restore(tre).code === codice);
check('tre quote diverse ricostruiscono lo stesso codice', kit.restore([prodotto.shares[1], prodotto.shares[3], prodotto.shares[4]]).code === codice);
check('due quote non bastano', errore(() => kit.restore(prodotto.shares.slice(0, 2))) === 'RECOVERY_SHARES_INSUFFICIENT');

const minuscolo = tre.map(s => s.toLowerCase());
check('accetta le quote scritte in minuscolo', kit.restore(minuscolo).code === codice);
const conSpazi = tre.map(s => '  ' + s.replace(/-/g, ' ') + '  ');
check('accetta spaziature e trattini diversi', kit.restore(conSpazi).code === codice);
const confusi = tre.map(s => s.replace(/1/g, 'I').replace(/0/g, 'O'));
check('corregge le confusioni tipiche I/1 e O/0', kit.restore(confusi).code === codice);

const corrotta = tre[0].slice(0, -1) + (tre[0].slice(-1) === 'Z' ? 'Y' : 'Z');
check('rileva una quota trascritta male tramite checksum', errore(() => codec.decodeShare(corrotta)) === 'SHARE_CHECKSUM_INVALID');
const ispezione = kit.inspectShares([corrotta, tre[1], tre[2]]);
check('l ispezione segnala la quota corrotta e conserva le valide', ispezione.errori.length === 1 && ispezione.quote.length === 2);

const altro = kit.createKit('AAA-BBB-CCC', { totalShares: 3, threshold: 2 });
check('rifiuta quote appartenenti a reti diverse', errore(() => kit.restore([tre[0], altro.shares[0]])) === 'RECOVERY_SHARES_MIXED');
check('le quote duplicate non contano come due', errore(() => kit.restore([tre[0], tre[0]])) === 'RECOVERY_NOT_ENOUGH_SHARES');

check('rifiuta una soglia superiore al totale', errore(() => kit.createKit(codice, { totalShares: 3, threshold: 4 })) === 'RECOVERY_THRESHOLD_INVALID');
check('rifiuta un totale fuori intervallo', errore(() => kit.createKit(codice, { totalShares: 99, threshold: 2 })) === 'RECOVERY_TOTAL_INVALID');

const recuperato = kit.restore(tre);
check('il publicId ricostruito coincide con quello originale', recuperato.publicId === identity.publicIdOf(codice));

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
