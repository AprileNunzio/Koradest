'use strict';

const { quotaIdentificatore } = require('./identificatori');

function rigaCorrente(archivio, tabella, recordId) {
    return archivio.query(`SELECT * FROM ${quotaIdentificatore(tabella)} WHERE CAST(id AS TEXT) = ?`, [recordId])[0] || null;
}

function inoltra(archivio, cambi, replica) {
    if (typeof replica !== 'function') return;
    cambi.forEach((cambio) => {
        if (cambio.azione === 'DELETE') {
            replica('DELETE', cambio.tabella, cambio.recordId, { id: cambio.prima ? cambio.prima.id : cambio.recordId, deleted_at: new Date().toISOString() });
            return;
        }
        const riga = rigaCorrente(archivio, cambio.tabella, cambio.recordId);
        if (riga) replica(cambio.azione, cambio.tabella, riga.id, riga);
    });
}

module.exports = { inoltra };
