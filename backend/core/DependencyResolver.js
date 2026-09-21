'use strict';

// Albero delle dipendenze fra applicazioni. Un manifest dichiara
//   "dependencies": { "anagrafica": ">=1.0.0", "alunni": "^2.0.0" }
// oppure un semplice elenco di id. L'installazione procede in ordine
// topologico: prima le dipendenze, per ultima l'app richiesta.

const CORE_MODULES = new Set([
    'core',
    'core:users',
    'core:rbac',
    'core:auth',
    'core:notifications',
    'core:session',
    'anagrafica'
]);

function isCoreModule(id) {
    return !id || id === 'core' || String(id).startsWith('core:') || CORE_MODULES.has(id);
}

function dipendenzeDi(manifest) {
    const dichiarate = manifest && manifest.dependencies;
    if (!dichiarate) return [];
    if (Array.isArray(dichiarate)) {
        return dichiarate
            .filter(id => typeof id === 'string' && id.length > 0)
            .map(id => ({ id, vincolo: '*' }));
    }
    if (typeof dichiarate === 'object') {
        return Object.entries(dichiarate)
            .filter(([id]) => id.length > 0)
            .map(([id, vincolo]) => ({ id, vincolo: typeof vincolo === 'string' && vincolo.trim() ? vincolo.trim() : '*' }));
    }
    return [];
}

function parti(versione) {
    return String(versione || '0')
        .replace(/^v/i, '')
        .split(/[.+-]/)
        .slice(0, 3)
        .map(numero => parseInt(numero, 10) || 0);
}

function confrontaVersioni(a, b) {
    const x = parti(a);
    const y = parti(b);
    for (let i = 0; i < 3; i++) {
        const differenza = (x[i] || 0) - (y[i] || 0);
        if (differenza !== 0) return differenza > 0 ? 1 : -1;
    }
    return 0;
}

function soddisfaSingolo(versione, vincolo) {
    const trovato = vincolo.match(/^(>=|<=|>|<|=|\^|~)?v?(\d+(?:\.\d+){0,2})$/);
    if (!trovato) return false;
    const operatore = trovato[1] || '=';
    const riferimento = trovato[2];
    const esito = confrontaVersioni(versione, riferimento);
    const [maggiore, minore] = parti(riferimento);
    const [versioneMaggiore, versioneMinore] = parti(versione);
    switch (operatore) {
        case '>=': return esito >= 0;
        case '>': return esito > 0;
        case '<=': return esito <= 0;
        case '<': return esito < 0;
        case '^': return esito >= 0 && versioneMaggiore === maggiore;
        case '~': return esito >= 0 && versioneMaggiore === maggiore && versioneMinore === minore;
        default: return esito === 0;
    }
}

function soddisfaVersione(versione, vincolo) {
    const testo = String(vincolo || '*').trim();
    if (testo === '' || testo === '*' || testo.toLowerCase() === 'latest') return true;
    if (versione === null || versione === undefined || versione === '') return false;
    return testo.split(/\s+/).every(pezzo => soddisfaSingolo(versione, pezzo));
}

function normalizzaInstallate(installedApps) {
    const mappa = new Map();
    for (const voce of Array.isArray(installedApps) ? installedApps : []) {
        if (typeof voce === 'string') {
            mappa.set(voce, null);
        } else if (voce && (voce.id || voce.app_id)) {
            mappa.set(voce.id || voce.app_id, voce.version || voce.installedVersion || null);
        }
    }
    return mappa;
}

function pianificaInstallazione(appId, availableApps, installedApps = []) {
    const disponibili = new Map((availableApps || []).filter(a => a && a.id).map(a => [a.id, a]));
    const installate = normalizzaInstallate(installedApps);
    const ordine = [];
    const mancanti = [];
    const incompatibili = [];
    const cicli = [];
    const completate = new Set();
    const pila = [];

    function visita(id, vincolo, richiestaDa) {
        if (isCoreModule(id)) return;
        const posizione = pila.indexOf(id);
        if (posizione !== -1) {
            cicli.push([...pila.slice(posizione), id]);
            return;
        }
        if (completate.has(id)) return;

        const bersaglio = richiestaDa === null;
        if (!bersaglio && installate.has(id)) {
            const versioneInstallata = installate.get(id);
            if (versioneInstallata === null || soddisfaVersione(versioneInstallata, vincolo)) {
                completate.add(id);
                return;
            }
        }

        const manifest = disponibili.get(id);
        if (!manifest) {
            mancanti.push({ id, richiestaDa });
            completate.add(id);
            return;
        }
        if (!bersaglio && !soddisfaVersione(manifest.version, vincolo)) {
            incompatibili.push({
                id,
                vincolo,
                disponibile: manifest.version || null,
                installata: installate.has(id) ? installate.get(id) : null,
                richiestaDa
            });
            completate.add(id);
            return;
        }

        pila.push(id);
        for (const dipendenza of dipendenzeDi(manifest)) {
            visita(dipendenza.id, dipendenza.vincolo, id);
        }
        pila.pop();
        completate.add(id);
        ordine.push(id);
    }

    visita(appId, '*', null);
    return {
        ordine,
        mancanti,
        incompatibili,
        cicli,
        ok: mancanti.length === 0 && incompatibili.length === 0 && cicli.length === 0
    };
}

function descriviProblemi(piano, nomeDi = id => id) {
    const frasi = [];
    for (const voce of piano.mancanti) {
        frasi.push(voce.richiestaDa
            ? `"${nomeDi(voce.richiestaDa)}" richiede "${nomeDi(voce.id)}", che non è disponibile in nessun repository attivo`
            : `"${nomeDi(voce.id)}" non è disponibile in nessun repository attivo`);
    }
    for (const voce of piano.incompatibili) {
        frasi.push(`"${nomeDi(voce.richiestaDa)}" richiede "${nomeDi(voce.id)}" ${voce.vincolo}, ma lo Store offre la versione ${voce.disponibile || 'sconosciuta'}`);
    }
    for (const ciclo of piano.cicli) {
        frasi.push(`dipendenza circolare: ${ciclo.map(nomeDi).join(' → ')}`);
    }
    return frasi.join('; ');
}

function resolve(appId, availableApps, installedApps = []) {
    return pianificaInstallazione(appId, availableApps, installedApps).ordine;
}

function getMissingDeps(appId, availableApps, installedApps = []) {
    const manifest = (availableApps || []).find(a => a && a.id === appId);
    if (!manifest) return [];
    const installate = normalizzaInstallate(installedApps);
    return dipendenzeDi(manifest)
        .map(dipendenza => dipendenza.id)
        .filter(id => !isCoreModule(id) && !installate.has(id));
}

function canUninstall(appId, installedApps, availableApps) {
    const disponibili = new Map((availableApps || []).filter(a => a && a.id).map(a => [a.id, a]));
    const blockedBy = [];
    for (const voce of installedApps || []) {
        const id = typeof voce === 'string' ? voce : (voce && (voce.id || voce.app_id));
        if (!id || id === appId) continue;
        const manifest = disponibili.get(id);
        if (manifest && dipendenzeDi(manifest).some(dipendenza => dipendenza.id === appId)) {
            blockedBy.push(id);
        }
    }
    return { canUninstall: blockedBy.length === 0, blockedBy };
}

module.exports = {
    resolve,
    pianificaInstallazione,
    descriviProblemi,
    dipendenzeDi,
    soddisfaVersione,
    confrontaVersioni,
    getMissingDeps,
    canUninstall,
    isCoreModule,
    CORE_MODULES
};
