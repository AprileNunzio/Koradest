'use strict';

const crypto = require('crypto');

const GENESI = '0'.repeat(64);
const CAMPI = ['tabella', 'record_id', 'campo', 'azione', 'prima', 'dopo', 'operatore_id', 'data_ora'];

function impronta(precedente, voce) {
    const contenuto = JSON.stringify(CAMPI.map(campo => (voce[campo] === undefined ? null : voce[campo])));
    return crypto.createHash('sha256').update(`${precedente}|${contenuto}`).digest('hex');
}

function ultimaImpronta(archivio) {
    const riga = archivio.query('SELECT impronta FROM _k_audit ORDER BY seq DESC LIMIT 1')[0];
    return riga ? riga.impronta : GENESI;
}

function verifica(archivio) {
    const righe = archivio.query('SELECT * FROM _k_audit ORDER BY seq');
    let precedente = GENESI;
    for (const riga of righe) {
        if (riga.impronta_precedente !== precedente || impronta(precedente, riga) !== riga.impronta) {
            return { integra: false, primaVoceAlterata: riga.seq, verificate: righe.indexOf(riga) };
        }
        precedente = riga.impronta;
    }
    return { integra: true, primaVoceAlterata: null, verificate: righe.length };
}

module.exports = { impronta, ultimaImpronta, verifica, GENESI };
