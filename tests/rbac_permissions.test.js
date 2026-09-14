const Module = require('module');
const path = require('path');
const fs = require('fs');
const { creaAmbiente } = require('./helpers/db_reale');

const ambiente = creaAmbiente({ auth: require(path.resolve('backend/migrations/auth')) });

const originalLoad = Module._load;
Module._load = function (request, parent) {
    if (request === 'electron') return { app: { getPath: () => path.resolve('.'), on: () => {} }, BrowserWindow: { getAllWindows: () => [] } };
    const risolto = request.replace(/\\/g, '/');
    if (risolto.endsWith('/db') && parent && parent.filename && parent.filename.includes('backend')) return ambiente.stub;
    return originalLoad.apply(this, arguments);
};

const rbac = require(path.resolve('backend/handlers/rbac'));
const politica = require(path.resolve('backend/security/ipc_policy'));
const auth = ambiente.database.auth;

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

function permessiDichiaratiNeiManifest() {
    const dichiarati = new Set();
    const etichette = [];
    const base = path.resolve('src/apps');
    for (const voce of fs.readdirSync(base, { withFileTypes: true })) {
        if (!voce.isDirectory()) continue;
        const manifest = path.join(base, voce.name, 'manifest.json');
        if (fs.existsSync(manifest)) {
            const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
            for (const p of m.rbacPermissions || []) {
                dichiarati.add(`${m.id || voce.name}:${p.id}`);
                etichette.push(p.label || p.id);
            }
        }
        const subapps = path.join(base, voce.name, 'subapps');
        if (!fs.existsSync(subapps)) continue;
        for (const sub of fs.readdirSync(subapps, { withFileTypes: true })) {
            if (!sub.isDirectory()) continue;
            const smPath = path.join(subapps, sub.name, 'manifest.json');
            if (!fs.existsSync(smPath)) continue;
            const sm = JSON.parse(fs.readFileSync(smPath, 'utf8'));
            for (const p of sm.rbacPermissions || []) {
                dichiarati.add(`${voce.name}:${sm.id || sub.name}:${p.id}`);
                etichette.push(p.label || p.id);
            }
        }
    }
    return { dichiarati, etichette };
}

const { dichiarati, etichette } = permessiDichiaratiNeiManifest();
const etichetteDuplicate = etichette.length - new Set(etichette).size;
console.log(`Permessi dichiarati nei manifest reali: ${dichiarati.size}`);
console.log(`Etichette ripetute fra moduli diversi: ${etichetteDuplicate}`);

rbac.syncPermissionsFromManifests();
const registrati = auth.query('SELECT id, name FROM permissions ORDER BY id');
const presenti = new Set(registrati.map(p => p.id));
const persi = [...dichiarati].filter(id => !presenti.has(id));

console.log(`Permessi registrati in banca dati: ${registrati.length}`);

check('il caso critico esiste davvero: piu moduli usano la stessa etichetta', etichetteDuplicate > 0);
check('nessun permesso dichiarato va perso per collisione di etichetta', persi.length === 0);
if (persi.length > 0) console.log('  persi: ' + persi.join(', '));

const nomi = registrati.map(p => p.name);
check('le etichette registrate sono tutte distinte', new Set(nomi).size === nomi.length);

const vistaUtenti = registrati.find(p => p.id === 'amministratore:utenti:view');
check('l etichetta dichiara a quale modulo appartiene', Boolean(vistaUtenti) && vistaUtenti.name.includes('Visualizza'));
const vistaRbac = registrati.find(p => p.id === 'amministratore:rbac:view');
check('due moduli con la stessa etichetta restano distinguibili', Boolean(vistaRbac) && vistaRbac.name !== vistaUtenti.name);

rbac.syncPermissionsFromManifests();
check('una seconda sincronizzazione non duplica nulla', auth.query('SELECT id FROM permissions').length === registrati.length);

const richiesti = new Set(Object.values(politica.PERMISSION).flat());
const nonRegistrati = [...richiesti].filter(id => !presenti.has(id));
check('ogni permesso richiesto dalla politica IPC esiste in banca dati', nonRegistrati.length === 0);
if (nonRegistrati.length > 0) console.log('  non registrati: ' + nonRegistrati.join(', '));

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
