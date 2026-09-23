'use strict';

const fs = require('fs');
const path = require('path');

const FORNITORE_VALIDO = /^[a-z][a-z0-9_-]{1,31}$/;
const CHIAVE_VALIDA = /^[\x21-\x7e]{16,256}$/;

function creaCassaforte({ cifratore, percorso }) {
    const leggiArchivio = () => (fs.existsSync(percorso) ? JSON.parse(fs.readFileSync(percorso, 'utf8')) : {});

    const scriviArchivio = (archivio) => {
        fs.mkdirSync(path.dirname(percorso), { recursive: true });
        const temporaneo = `${percorso}.tmp`;
        fs.writeFileSync(temporaneo, JSON.stringify(archivio), { mode: 0o600 });
        fs.renameSync(temporaneo, percorso);
    };

    const richiediCifratore = () => {
        if (!cifratore || !cifratore.isEncryptionAvailable()) {
            throw new Error('La cifratura del sistema operativo non è disponibile: la chiave non può essere custodita in modo sicuro');
        }
        return cifratore;
    };

    const controllaFornitore = (fornitore) => {
        if (!FORNITORE_VALIDO.test(String(fornitore || ''))) throw new Error('Fornitore non valido');
    };

    return Object.freeze({
        salva(fornitore, chiave) {
            controllaFornitore(fornitore);
            const pulita = String(chiave || '').trim();
            if (!CHIAVE_VALIDA.test(pulita)) throw new Error('La chiave API non ha un formato valido');
            const archivio = leggiArchivio();
            archivio[fornitore] = richiediCifratore().encryptString(pulita).toString('base64');
            scriviArchivio(archivio);
            return { configurata: true, finale: pulita.slice(-4) };
        },
        leggi(fornitore) {
            controllaFornitore(fornitore);
            const cifrata = leggiArchivio()[fornitore];
            return cifrata ? richiediCifratore().decryptString(Buffer.from(cifrata, 'base64')) : null;
        },
        rimuovi(fornitore) {
            controllaFornitore(fornitore);
            const archivio = leggiArchivio();
            delete archivio[fornitore];
            scriviArchivio(archivio);
            return { configurata: false };
        },
        descrivi(fornitore) {
            controllaFornitore(fornitore);
            const chiave = this.leggi(fornitore);
            return chiave ? { configurata: true, finale: chiave.slice(-4) } : { configurata: false, finale: null };
        }
    });
}

module.exports = { creaCassaforte };
