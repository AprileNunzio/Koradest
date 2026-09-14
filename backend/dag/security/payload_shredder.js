'use strict';

const MARCATORE = '_shredded';
const TOMBSTONE = JSON.stringify({ [MARCATORE]: true });
const TABELLA_RICHIESTE = 'gdpr_shred';

function _ledger() {
    return require('../../db').getDB('ledger');
}

function isTombstone(payload) {
    if (!payload) return false;
    if (typeof payload === 'string') {
        try {
            return isTombstone(JSON.parse(payload));
        } catch (_) {
            return false;
        }
    }
    return payload[MARCATORE] === true;
}

function shredTargets(targets, contesto = {}) {
    if (!Array.isArray(targets) || targets.length === 0) return { cancellati: 0, blocchi: [] };
    const ledger = _ledger();
    const adesso = contesto.shreddedAt || Date.now();
    let cancellati = 0;
    const blocchi = [];
    for (const bersaglio of targets) {
        if (!bersaglio || !bersaglio.table || bersaglio.recordId === undefined) continue;
        const righe = ledger.query(
            "SELECT block_id FROM event_log WHERE table_name = ? AND record_id = ? AND payload_state != 'shredded'",
            [String(bersaglio.table), String(bersaglio.recordId)]
        );
        if (!righe || righe.length === 0) continue;
        ledger.run(
            "UPDATE event_log SET payload = ?, payload_state = 'shredded', shredded_at = ? WHERE table_name = ? AND record_id = ? AND payload_state != 'shredded'",
            [TOMBSTONE, adesso, String(bersaglio.table), String(bersaglio.recordId)]
        );
        cancellati += righe.length;
        for (const riga of righe) blocchi.push(riga.block_id);
    }
    if (cancellati > 0) require('../../db').saveDB('ledger');
    return { cancellati, blocchi };
}

function shredStats() {
    const ledger = _ledger();
    const righe = ledger.query("SELECT payload_state AS stato, COUNT(*) AS totale FROM event_log GROUP BY payload_state");
    const esito = { plain: 0, shredded: 0 };
    for (const riga of righe || []) esito[riga.stato] = Number(riga.totale) || 0;
    return esito;
}

function residuiPerBersaglio(targets) {
    const ledger = _ledger();
    let residui = 0;
    for (const bersaglio of targets || []) {
        const righe = ledger.query(
            "SELECT COUNT(*) AS totale FROM event_log WHERE table_name = ? AND record_id = ? AND payload_state != 'shredded'",
            [String(bersaglio.table), String(bersaglio.recordId)]
        );
        residui += righe && righe.length > 0 ? Number(righe[0].totale) || 0 : 0;
    }
    return residui;
}

module.exports = { MARCATORE, TOMBSTONE, TABELLA_RICHIESTE, isTombstone, shredTargets, shredStats, residuiPerBersaglio };
