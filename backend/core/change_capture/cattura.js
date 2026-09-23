'use strict';

const introspezione = require('./introspezione');
const trigger = require('./trigger_temporanei');
const registro = require('./registro_cambi');

const versioni = new WeakMap();
const livelli = new WeakMap();

function allinea(archivio) {
    const versione = introspezione.versioneSchema(archivio);
    if (versioni.get(archivio) === versione) return;
    registro.preparaTabelle(archivio);
    trigger.installa(archivio, introspezione.tabelleTracciabili(archivio));
    versioni.set(archivio, versione);
}

function annullaPuntoDiRipristino(archivio, nome, errore) {
    archivio.run(`ROLLBACK TO ${nome}`, []);
    archivio.run(`RELEASE ${nome}`, []);
    throw errore;
}

function traccia(archivio, funzione, registraCambi) {
    allinea(archivio);
    const livello = livelli.get(archivio) || 0;
    const puntoDiRipristino = `k_op_${livello}`;
    archivio.run(`SAVEPOINT ${puntoDiRipristino}`, []);
    livelli.set(archivio, livello + 1);
    if (livello === 0) registro.apriSessione(archivio);
    try {
        const risultato = funzione(archivio);
        const cambi = livello === 0 ? registro.estraiCambi(archivio) : [];
        if (cambi.length > 0) registraCambi(cambi);
        archivio.run(`RELEASE ${puntoDiRipristino}`, []);
        return { risultato, cambi };
    } catch (errore) {
        return annullaPuntoDiRipristino(archivio, puntoDiRipristino, errore);
    } finally {
        livelli.set(archivio, livello);
        if (livello === 0) registro.chiudiSessione(archivio);
    }
}

function dimentica(archivio) {
    versioni.delete(archivio);
    livelli.delete(archivio);
}

module.exports = { traccia, allinea, dimentica };
