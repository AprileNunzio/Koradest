'use strict';

// File system gerarchico: ogni applicazione ha una cartella dentro la rete attiva,
//   <dati>/dbs/<Rete>/apps/<id-app>/allegati, export, ...
// Un'app non puo uscire dalla propria cartella, ne vedere quella di un'altra rete.

const fs = require('fs');
const path = require('path');

const CARTELLE_STANDARD = Object.freeze(['allegati', 'export']);

function nomeSicuro(valore) {
    const pulito = String(valore || '').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '');
    if (!pulito) throw new Error('Identificativo applicazione non valido per il file system');
    return pulito;
}

function radiceReteAttiva() {
    const dbManager = require('../../db/db_manager');
    if (!dbManager.basePath) dbManager.initPaths();
    return dbManager.basePath;
}

function cartellaAppIn(radiceRete, appId) {
    return path.join(radiceRete, 'apps', nomeSicuro(appId));
}

function creaFileApp(manifest, radice = radiceReteAttiva) {
    const appId = manifest && manifest.id;
    nomeSicuro(appId);

    function base() {
        const radiceRete = radice();
        if (!radiceRete) throw new Error('Nessuna rete attiva: i file dell\'applicazione non sono disponibili');
        return path.resolve(cartellaAppIn(radiceRete, appId));
    }

    function percorso(...pezzi) {
        const cartellaApp = base();
        const destinazione = path.resolve(cartellaApp, ...pezzi.map(String));
        if (destinazione !== cartellaApp && !destinazione.startsWith(cartellaApp + path.sep)) {
            throw new Error('Percorso fuori dalla cartella dell\'applicazione');
        }
        return destinazione;
    }

    function cartella(nome = '') {
        const destinazione = percorso(nome);
        fs.mkdirSync(destinazione, { recursive: true });
        return destinazione;
    }

    return Object.freeze({ percorso, cartella, radice: () => cartella(), CARTELLE_STANDARD });
}

module.exports = { creaFileApp, cartellaAppIn, nomeSicuro, CARTELLE_STANDARD };
