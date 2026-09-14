const fs = require('fs');
const os = require('os');
const path = require('path');
const { valida, normalizza, confrontaVersioni } = require(path.resolve('backend/core/manifest/manifest_v2'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const contiene = (esito, frammento) => esito.errori.some(e => e.includes(frammento));

const base = () => ({
    manifestVersion: 2,
    id: 'alunni',
    name: 'Alunni',
    version: '1.0.0',
    author: 'NunzioTech',
    description: 'Anagrafica degli alunni, classi e fascicolo sanitario della scuola.',
    category: 'scuola',
    icon: 'school',
    color: '#0284c7',
    minCoreVersion: '1.1.0',
    entry: { ui: 'ui/index.html', backend: 'backend/index.js' },
    data: { migrations: 'backend/migrazioni.js', localTables: [] },
    dependencies: { anagrafica: '*' },
    permissions: ['app:anagrafica:*', 'kernel:email'],
    roles: [{ id: 'lettura', label: 'Consulta gli alunni', default: true }, { id: 'gestione', label: 'Modifica gli alunni', default: false }]
});

check('un manifest v2 completo e valido', valida(base(), { versioneCore: '1.1.0' }).valido);

const senzaVersione = base();
delete senzaVersione.manifestVersion;
check('un manifest senza manifestVersion viene rifiutato', contiene(valida(senzaVersione), 'manifestVersion'));

const vecchio = { ...base(), main: 'app.js', ipc: { namespace: 'alunni' }, rbacPermissions: [] };
const esitoVecchio = valida(vecchio);
check('i campi del vecchio formato vengono segnalati con il sostituto', contiene(esitoVecchio, 'entry.ui') && contiene(esitoVecchio, '"roles"'));

check('un id con maiuscole viene rifiutato', contiene(valida({ ...base(), id: 'Alunni' }), '"id"'));
check('un ingresso che esce dalla cartella viene rifiutato', contiene(valida({ ...base(), entry: { ui: '../core/index.html' } }), 'entry.ui'));
check('un ingresso assoluto viene rifiutato', contiene(valida({ ...base(), entry: { ui: 'C:/Windows/x.html' } }), 'entry.ui'));
check('un permesso scritto come oggetto viene rifiutato', contiene(valida({ ...base(), permissions: [{ app: 'alunni' }] }), 'permesso non valido'));
check('un permesso sul kernel non previsto viene rifiutato', contiene(valida({ ...base(), permissions: ['kernel:filesystem'] }), 'kernel:filesystem'));
check('una versione minima del core superiore a quella installata viene rifiutata', contiene(valida(base(), { versioneCore: '1.0.9' }), 'richiede KORADEST 1.1.0'));
check('un ruolo duplicato viene rifiutato', contiene(valida({ ...base(), roles: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] }), 'due volte'));
check('dati senza backend vengono rifiutati', contiene(valida({ ...base(), entry: { ui: 'ui/index.html' } }), 'entry.backend'));
check('una descrizione troppo lunga viene rifiutata', contiene(valida({ ...base(), description: 'x'.repeat(161) }), 'description'));

const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'koradest-manifest-'));
try {
    fs.mkdirSync(path.join(cartella, 'ui'));
    fs.writeFileSync(path.join(cartella, 'ui', 'index.html'), '<!doctype html>');
    const mancante = valida(base(), { cartella });
    check('i file dichiarati ma assenti vengono segnalati', contiene(mancante, 'backend/index.js') && contiene(mancante, 'backend/migrazioni.js'));
    fs.mkdirSync(path.join(cartella, 'backend'));
    fs.writeFileSync(path.join(cartella, 'backend', 'index.js'), '');
    fs.writeFileSync(path.join(cartella, 'backend', 'migrazioni.js'), '');
    check('con tutti i file presenti il pacchetto e valido', valida(base(), { cartella }).valido);
} finally {
    fs.rmSync(cartella, { recursive: true, force: true });
}

const normalizzato = normalizza(base());
check('la normalizzazione espone i campi usati dal core',
    normalizzato.main === 'ui/index.html' &&
    normalizzato.backend === 'backend/index.js' &&
    normalizzato.db.namespace === 'alunni' &&
    normalizzato.ipc.namespace === 'alunni' &&
    normalizzato.rbacPermissions.length === 2);
check('le versioni si confrontano come numeri', confrontaVersioni('1.10.0', '1.9.0') > 0 && confrontaVersioni('1.1.0', '1.1.0') === 0);

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : `\n${failures} CONTROLLI FALLITI`);
process.exit(failures === 0 ? 0 : 1);
