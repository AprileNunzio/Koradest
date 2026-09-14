const path = require('path');
const crypto = require('crypto');
const shamir = require(path.resolve('backend/networks/recovery/shamir'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

function mulRiferimento(a, b) {
    let risultato = 0;
    while (b > 0) {
        if (b & 1) risultato ^= a;
        const alto = a & 0x80;
        a = (a << 1) & 0xff;
        if (alto) a ^= 0x1b;
        b >>= 1;
    }
    return risultato;
}

let mulOk = true;
for (let a = 0; a < 256 && mulOk; a++) {
    for (let b = 0; b < 256; b++) {
        if (shamir.mul(a, b) !== mulRiferimento(a, b)) { mulOk = false; console.log('  divergenza su ' + a + '*' + b); break; }
    }
}
check('la moltiplicazione in GF(256) coincide con l implementazione di riferimento su tutte le 65536 coppie', mulOk);

let divOk = true;
for (let a = 0; a < 256 && divOk; a++) {
    for (let b = 1; b < 256; b++) {
        if (shamir.mul(shamir.div(a, b), b) !== a) { divOk = false; console.log('  divergenza su ' + a + '/' + b); break; }
    }
}
check('la divisione e l inversa esatta della moltiplicazione', divOk);

const combinazioni = (arr, k) => {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [primo, ...resto] = arr;
    return combinazioni(resto, k - 1).map(c => [primo, ...c]).concat(combinazioni(resto, k));
};

const segreto = Buffer.from('K7M-P4Q-R2X', 'utf8');
let tutteOk = true;
for (let n = 2; n <= 8 && tutteOk; n++) {
    for (let k = 2; k <= n; k++) {
        const quote = shamir.split(segreto, n, k);
        for (const sottoinsieme of combinazioni(quote, k)) {
            const ricostruito = shamir.combine(sottoinsieme);
            if (!ricostruito.equals(segreto)) {
                tutteOk = false;
                console.log(`  fallita ricostruzione n=${n} k=${k} indici=${sottoinsieme.map(s => s.index).join(',')}`);
                break;
            }
        }
        if (!tutteOk) break;
    }
}
check('ogni sottoinsieme di k quote su n ricostruisce il segreto (n da 2 a 8)', tutteOk);

const quote5su3 = shamir.split(segreto, 5, 3);
let insufficienteRivela = false;
for (const coppia of combinazioni(quote5su3, 2)) {
    const tentativo = shamir.combine(coppia);
    if (tentativo.equals(segreto)) insufficienteRivela = true;
}
check('due quote su una soglia di tre non ricostruiscono il segreto', !insufficienteRivela);

const lunghi = crypto.randomBytes(64);
const quoteLunghe = shamir.split(lunghi, 6, 4);
check('funziona anche su segreti lunghi (64 byte)', shamir.combine(quoteLunghe.slice(0, 4)).equals(lunghi));
check('le quote hanno la stessa lunghezza del segreto', quoteLunghe.every(q => q.data.length === lunghi.length));
check('nessuna quota coincide con il segreto in chiaro', !quoteLunghe.some(q => q.data.equals(lunghi)));

const errore = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
check('rifiuta una soglia maggiore del numero di quote', errore(() => shamir.split(segreto, 3, 5)) === 'SHAMIR_THRESHOLD_INVALID');
check('rifiuta quote duplicate', errore(() => shamir.combine([quote5su3[0], quote5su3[0]])) === 'SHAMIR_DUPLICATE_SHARE');
check('rifiuta un segreto vuoto', errore(() => shamir.split(Buffer.alloc(0), 3, 2)) === 'SHAMIR_SECRET_INVALID');

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
