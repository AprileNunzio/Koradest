'use strict';

const BLOB = /^blob:([0-9A-F]*)$/;

function preparaTabelle(archivio) {
    archivio.run('CREATE TEMP TABLE IF NOT EXISTS _k_sessione (attiva INTEGER NOT NULL)', []);
    archivio.run('CREATE TEMP TABLE IF NOT EXISTS _k_cambi (seq INTEGER PRIMARY KEY AUTOINCREMENT, tabella TEXT NOT NULL, record_id TEXT, azione TEXT NOT NULL, prima TEXT, dopo TEXT)', []);
}

function apriSessione(archivio) {
    archivio.run('DELETE FROM temp._k_sessione', []);
    archivio.run('INSERT INTO temp._k_sessione (attiva) VALUES (1)', []);
}

function chiudiSessione(archivio) {
    archivio.run('DELETE FROM temp._k_sessione', []);
}

function decodificaValore(valore) {
    const blob = typeof valore === 'string' ? BLOB.exec(valore) : null;
    return blob ? Buffer.from(blob[1], 'hex') : valore;
}

function decodificaRiga(testo) {
    if (testo === null || testo === undefined) return null;
    const riga = JSON.parse(testo);
    return Object.fromEntries(Object.entries(riga).map(([campo, valore]) => [campo, decodificaValore(valore)]));
}

function estraiCambi(archivio) {
    const righe = archivio.query('SELECT seq, tabella, record_id, azione, prima, dopo FROM temp._k_cambi ORDER BY seq');
    if (righe.length === 0) return [];
    archivio.run('DELETE FROM temp._k_cambi WHERE seq <= ?', [righe[righe.length - 1].seq]);
    return righe.map(riga => Object.freeze({
        tabella: riga.tabella,
        recordId: riga.record_id,
        azione: riga.azione,
        prima: decodificaRiga(riga.prima),
        dopo: decodificaRiga(riga.dopo)
    }));
}

module.exports = { preparaTabelle, apriSessione, chiudiSessione, estraiCambi };
