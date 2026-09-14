'use strict';

// Contratto delle applicazioni del Marketplace: manifest v2.
// I manifest precedenti non vengono accettati: niente installazione, niente caricamento.

const fs = require('fs');
const path = require('path');

const VERSIONE_MANIFEST = 2;
const ID = /^[a-z][a-z0-9_]{1,39}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const COLORE = /^#[0-9a-fA-F]{6}$/;
const RUOLO = /^[a-z][a-z0-9_]{0,39}$/;
const PERMESSO = /^(app:[a-z][a-z0-9_]{1,39}:(\*|[A-Za-z][\w.-]{0,79})|kernel:(email|notifiche))$/;
const MODULO = /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/;

const CAMPI_V1 = {
    main: 'usa "entry.ui"',
    backend: 'usa "entry.backend"',
    ipc: 'le azioni usano l\'id dell\'app come spazio dei nomi',
    db: 'usa "data"',
    rbacPermissions: 'usa "roles"',
    ui_injections: 'la card della dashboard e generata dal core',
    api_version: 'usa "manifestVersion": 2',
    folder: 'la cartella e decisa dallo Store',
    bundled: 'riservato alle app di sistema',
    core: 'riservato alle app di sistema'
};

function confrontaVersioni(a, b) {
    const pa = String(a || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
    }
    return 0;
}

function percorsoValido(valore, estensioni) {
    if (typeof valore !== 'string' || valore.trim() === '') return false;
    const normalizzato = valore.replace(/\\/g, '/');
    if (normalizzato.startsWith('/') || /^[a-zA-Z]:/.test(normalizzato)) return false;
    if (normalizzato.split('/').some(parte => parte === '..')) return false;
    return estensioni.includes(path.extname(normalizzato).toLowerCase());
}

function testo(valore, massimo) {
    return typeof valore === 'string' && valore.trim().length > 0 && valore.length <= massimo;
}

function valida(manifest, { cartella = null, versioneCore = null } = {}) {
    const errori = [];
    const errore = messaggio => errori.push(messaggio);

    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
        return { valido: false, errori: ['il manifest non e un oggetto JSON'] };
    }
    if (manifest.manifestVersion !== VERSIONE_MANIFEST) {
        errore(`"manifestVersion" deve valere ${VERSIONE_MANIFEST}: i manifest delle versioni precedenti non sono piu accettati`);
    }
    for (const [campo, suggerimento] of Object.entries(CAMPI_V1)) {
        if (Object.prototype.hasOwnProperty.call(manifest, campo)) {
            errore(`campo "${campo}" del vecchio formato non accettato: ${suggerimento}`);
        }
    }

    if (!ID.test(String(manifest.id || ''))) errore('"id": minuscole, cifre e trattino basso, da 2 a 40 caratteri, iniziando con una lettera');
    if (!testo(manifest.name, 60)) errore('"name" obbligatorio, al massimo 60 caratteri');
    if (!SEMVER.test(String(manifest.version || ''))) errore('"version" deve essere nella forma 1.2.3');
    if (!testo(manifest.author, 80)) errore('"author" obbligatorio');
    if (!testo(manifest.description, 160)) errore('"description" obbligatoria, al massimo 160 caratteri (il testo lungo va in "long_description")');
    if (!testo(manifest.category, 40)) errore('"category" obbligatoria');
    if (manifest.color !== undefined && !COLORE.test(String(manifest.color))) errore('"color" deve essere nella forma #0284c7');
    if (manifest.icon !== undefined && !testo(manifest.icon, 120)) errore('"icon" deve essere un nome di icona o un file dell\'app');

    if (!SEMVER.test(String(manifest.minCoreVersion || ''))) {
        errore('"minCoreVersion" obbligatoria nella forma 1.2.3');
    } else if (versioneCore && confrontaVersioni(manifest.minCoreVersion, versioneCore) > 0) {
        errore(`richiede KORADEST ${manifest.minCoreVersion} o successivo (installato: ${versioneCore})`);
    }

    const entry = manifest.entry;
    if (!entry || typeof entry !== 'object') {
        errore('"entry" obbligatorio con almeno "ui"');
    } else {
        if (!percorsoValido(entry.ui, ['.html'])) errore('"entry.ui" deve essere un file .html dentro la cartella dell\'app');
        if (entry.backend !== undefined && !percorsoValido(entry.backend, ['.js'])) errore('"entry.backend" deve essere un file .js dentro la cartella dell\'app');
    }

    if (manifest.data !== undefined) {
        const data = manifest.data;
        if (!data || typeof data !== 'object') {
            errore('"data" deve essere un oggetto');
        } else {
            if (data.namespace !== undefined && !ID.test(String(data.namespace))) errore('"data.namespace" non valido');
            if (!percorsoValido(data.migrations, ['.js'])) errore('"data.migrations" deve indicare il file .js delle migrazioni');
            if (data.localTables !== undefined && (!Array.isArray(data.localTables) || data.localTables.some(t => !/^[a-z][a-z0-9_]*$/.test(String(t))))) {
                errore('"data.localTables" deve essere un elenco di nomi di tabella');
            }
        }
        if (!entry || !entry.backend) errore('un\'app con "data" deve avere anche "entry.backend"');
    }

    if (manifest.dependencies !== undefined) {
        if (!manifest.dependencies || typeof manifest.dependencies !== 'object' || Array.isArray(manifest.dependencies)) {
            errore('"dependencies" deve essere un oggetto { "idApp": "vincolo" }');
        } else {
            for (const [dipendenza, vincolo] of Object.entries(manifest.dependencies)) {
                if (!ID.test(dipendenza) && !/^core:[a-z_]+$/.test(dipendenza)) errore(`dipendenza "${dipendenza}" con id non valido`);
                if (typeof vincolo !== 'string' || vincolo.trim() === '') errore(`dipendenza "${dipendenza}" senza vincolo di versione`);
                if (dipendenza === manifest.id) errore('un\'app non puo dipendere da se stessa');
            }
        }
    }

    if (manifest.permissions !== undefined) {
        if (!Array.isArray(manifest.permissions)) {
            errore('"permissions" deve essere un elenco di stringhe');
        } else {
            manifest.permissions
                .filter(p => typeof p !== 'string' || !PERMESSO.test(p))
                .forEach(p => errore(`permesso non valido: ${JSON.stringify(p)} (ammessi "app:<id>:<azione>", "app:<id>:*", "kernel:email", "kernel:notifiche")`));
        }
    }

    if (manifest.roles !== undefined) {
        if (!Array.isArray(manifest.roles)) {
            errore('"roles" deve essere un elenco di { id, label, default }');
        } else {
            const visti = new Set();
            manifest.roles.forEach((ruolo, indice) => {
                if (!ruolo || !RUOLO.test(String(ruolo.id || ''))) errore(`ruolo ${indice + 1}: "id" non valido`);
                else if (visti.has(ruolo.id)) errore(`ruolo "${ruolo.id}" dichiarato due volte`);
                else visti.add(ruolo.id);
                if (!ruolo || !testo(ruolo.label, 120)) errore(`ruolo ${indice + 1}: "label" obbligatoria`);
            });
        }
    }

    if (manifest.kernelModules !== undefined && (!Array.isArray(manifest.kernelModules) || manifest.kernelModules.some(m => !MODULO.test(String(m))))) {
        errore('"kernelModules" deve essere un elenco di nomi di pacchetto');
    }

    if (cartella && errori.length === 0) {
        const radice = path.resolve(cartella);
        const esiste = relativo => {
            const assoluto = path.resolve(radice, relativo);
            return assoluto.startsWith(radice + path.sep) && fs.existsSync(assoluto) && fs.statSync(assoluto).isFile();
        };
        if (!esiste(entry.ui)) errore(`file "${entry.ui}" indicato in "entry.ui" non trovato`);
        if (entry.backend && !esiste(entry.backend)) errore(`file "${entry.backend}" indicato in "entry.backend" non trovato`);
        if (manifest.data && !esiste(manifest.data.migrations)) errore(`file "${manifest.data.migrations}" indicato in "data.migrations" non trovato`);
    }

    return { valido: errori.length === 0, errori };
}

// Traduce il manifest v2 nei campi che il resto del core usa gia (AppLoader, RBAC, dashboard).
function normalizza(manifest) {
    const data = manifest.data || null;
    return {
        ...manifest,
        main: manifest.entry.ui,
        backend: manifest.entry.backend || null,
        ipc: { namespace: manifest.id },
        db: data ? {
            namespace: data.namespace || manifest.id,
            migrations: data.migrations,
            local_tables: Array.isArray(data.localTables) ? data.localTables : []
        } : undefined,
        permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
        rbacPermissions: Array.isArray(manifest.roles) ? manifest.roles : [],
        dependencies: manifest.dependencies || {}
    };
}

module.exports = { VERSIONE_MANIFEST, valida, normalizza, confrontaVersioni };
