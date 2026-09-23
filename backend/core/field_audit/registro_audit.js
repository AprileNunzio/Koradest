'use strict';

const schema = require('./schema_audit');
const catena = require('./catena_impronte');
const { vociDi, CAMPO_RECORD } = require('./differenze');

const LIMITE_STORICO = 200;

function registra(archivio, cambi, operatoreId) {
    schema.prepara(archivio);
    let precedente = catena.ultimaImpronta(archivio);
    const dataOra = new Date().toISOString();
    cambi.forEach((cambio) => {
        vociDi(cambio).forEach((voce) => {
            const riga = {
                tabella: cambio.tabella,
                record_id: String(cambio.recordId),
                campo: voce.campo,
                azione: cambio.azione,
                prima: voce.prima,
                dopo: voce.dopo,
                operatore_id: operatoreId || null,
                data_ora: dataOra
            };
            const attuale = catena.impronta(precedente, riga);
            archivio.run(
                'INSERT INTO _k_audit (tabella, record_id, campo, azione, prima, dopo, operatore_id, data_ora, impronta_precedente, impronta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [riga.tabella, riga.record_id, riga.campo, riga.azione, riga.prima, riga.dopo, riga.operatore_id, riga.data_ora, precedente, attuale]
            );
            precedente = attuale;
        });
    });
}

function decodifica(testo) {
    return testo === null || testo === undefined ? null : JSON.parse(testo);
}

function storico(archivio, { tabella, recordId, campo = null }) {
    schema.prepara(archivio);
    const filtroCampo = campo ? 'AND campo IN (?, ?)' : '';
    const parametri = campo ? [tabella, String(recordId), campo, CAMPO_RECORD] : [tabella, String(recordId)];
    return archivio.query(
        `SELECT seq, campo, azione, prima, dopo, operatore_id, data_ora FROM _k_audit WHERE tabella = ? AND record_id = ? ${filtroCampo} ORDER BY seq DESC LIMIT ${LIMITE_STORICO}`,
        parametri
    ).map(riga => ({
        seq: riga.seq,
        campo: riga.campo,
        azione: riga.azione,
        prima: decodifica(riga.prima),
        dopo: decodifica(riga.dopo),
        operatoreId: riga.operatore_id,
        dataOra: riga.data_ora
    }));
}

function verifica(archivio) {
    schema.prepara(archivio);
    return catena.verifica(archivio);
}

module.exports = { registra, storico, verifica, prepara: schema.prepara };
