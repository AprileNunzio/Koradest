const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'koradest-export-'));
const workspace = path.join(radice, 'dbs', 'net-abc123');
fs.mkdirSync(workspace, { recursive: true });
for (const nome of ['auth.enc', 'config.enc', 'ledger.enc']) {
    fs.writeFileSync(path.join(workspace, nome), Buffer.from('contenuto cifrato di ' + nome));
}
fs.writeFileSync(path.join(workspace, 'peer_cache.json'), '{}');

const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'electron') return { app: { getPath: () => radice, on: () => {} }, BrowserWindow: { getAllWindows: () => [] } };
    if (request.endsWith('db/db_manager')) return { basePath: workspace };
    if (request.endsWith('session/network_session')) {
        return {
            isActive: () => true,
            getActiveSlug: () => 'net-abc123',
            descriptor: () => ({ name: 'Rete di prova', publicId: 'abc123def456' })
        };
    }
    return originalLoad.apply(this, arguments);
};

const exporter = require(path.resolve('backend/networks/recovery/archive_exporter'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

const destinazione = path.join(radice, 'usb');
fs.mkdirSync(destinazione, { recursive: true });
const esito = exporter.esportaArchivio(destinazione);

check('copia solo gli archivi cifrati', esito.file === 3);
check('crea una cartella datata dedicata', fs.existsSync(esito.destinazione));
check('non copia file non cifrati', !fs.existsSync(path.join(esito.destinazione, 'peer_cache.json')));
check('scrive il manifesto', fs.existsSync(path.join(esito.destinazione, 'koradest-archivio.json')));

const verifica = exporter.verificaArchivio(esito.destinazione);
check('la verifica riconosce l archivio integro', verifica.integro === true);
check('il manifesto riporta il nome della rete', verifica.rete.nome === 'Rete di prova');

fs.writeFileSync(path.join(esito.destinazione, 'auth.enc'), Buffer.from('manomesso'));
const dopoManomissione = exporter.verificaArchivio(esito.destinazione);
check('la verifica rileva un file alterato', dopoManomissione.integro === false);
check('indica quale file e alterato', dopoManomissione.esiti.some(e => e.file === 'auth.enc' && e.stato === 'alterato'));

fs.unlinkSync(path.join(esito.destinazione, 'config.enc'));
const dopoCancellazione = exporter.verificaArchivio(esito.destinazione);
check('la verifica rileva un file mancante', dopoCancellazione.esiti.some(e => e.file === 'config.enc' && e.stato === 'mancante'));

const errore = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
check('rifiuta una destinazione non indicata', errore(() => exporter.esportaArchivio(null)) === 'EXPORT_DESTINATION_MISSING');
check('rifiuta una cartella senza manifesto', errore(() => exporter.verificaArchivio(radice)) === 'EXPORT_MANIFEST_MISSING');

fs.rmSync(radice, { recursive: true, force: true });
console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
