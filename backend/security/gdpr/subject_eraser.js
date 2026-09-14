'use strict';
const crypto = require('crypto');
const planner = require('./erasure_planner');
const shredder = require('../../dag/security/payload_shredder');

const ANONIMO = 'dato-rimosso';

function _db(dominio) {
    return require('../../db').getDB(dominio);
}

function _colonne(db, tabella) {
    const info = db.query(`PRAGMA table_info(${tabella})`);
    return new Set((info || []).map(c => c.name));
}

function _cancellaRiga(bersaglio, adesso) {
    const db = _db(bersaglio.dominio);
    const colonne = _colonne(db, bersaglio.table);
    if (colonne.size === 0) return false;
    if (colonne.has('is_deleted')) {
        const assegnazioni = ['is_deleted = 1'];
        const valori = [];
        if (colonne.has('last_modified')) {
            assegnazioni.push('last_modified = ?');
            valori.push(adesso);
        }
        db.run(`UPDATE ${bersaglio.table} SET ${assegnazioni.join(', ')} WHERE id = ?`, [...valori, bersaglio.recordId]);
    } else {
        db.run(`DELETE FROM ${bersaglio.table} WHERE id = ?`, [bersaglio.recordId]);
    }
    return true;
}

function _anonimizzaUtente(userId, adesso) {
    const db = _db('auth');
    if (!userId) return false;
    db.run(
        "UPDATE users SET username = ?, email = '', nome = ?, cognome = ?, password = '', pin = '', passkey = '', is_superadmin = 0, is_deleted = 1, last_modified = ? WHERE id = ?",
        [`${ANONIMO}-${String(userId).slice(0, 8)}`, ANONIMO, ANONIMO, adesso, userId]
    );
    return true;
}

async function eraseSubject(personaId, attore) {
    const piano = planner.pianificaCancellazione(personaId);
    const adesso = Date.now();
    const dominiToccati = new Set();

    for (const bersaglio of piano.bersagli) {
        if (bersaglio.table === 'users') continue;
        if (_cancellaRiga(bersaglio, adesso)) dominiToccati.add(bersaglio.dominio);
    }
    if (piano.utenteCollegato) {
        _anonimizzaUtente(piano.utenteCollegato, adesso);
        dominiToccati.add('auth');
    }

    const { wrapMutationWithEvent, saveDB } = require('../../db');
    const richiestaId = crypto.randomUUID();
    const istruzione = {
        id: richiestaId,
        subject_id: personaId,
        targets: piano.bersagli.map(b => ({ table: b.table, recordId: String(b.recordId) })),
        requested_by: attore || '',
        requested_at: adesso
    };
    wrapMutationWithEvent('SHRED', shredder.TABELLA_RICHIESTE, richiestaId, istruzione);

    const esito = shredder.shredTargets(istruzione.targets, { shreddedAt: adesso });

    for (const dominio of dominiToccati) await saveDB(dominio, true);

    try {
        require('../../security/developer_vault').deleteRecordMutations('persone', personaId).catch(() => {});
    } catch (_) {}
    try {
        require('../../observability/auditLogger').logEvent(attore || 'system', 'GDPR_ERASE', 'persona', personaId, {
            bersagli: istruzione.targets.length,
            blocchiCancellati: esito.cancellati
        }, 'SUCCESS');
    } catch (_) {}

    return {
        success: true,
        richiestaId,
        soggetto: personaId,
        utenteAnonimizzato: piano.utenteCollegato || null,
        righeRimosse: piano.bersagli.length,
        blocchiCancellati: esito.cancellati,
        residuiNelRegistro: shredder.residuiPerBersaglio(istruzione.targets)
    };
}

function applyRemoteShred(istruzione) {
    if (!istruzione || !Array.isArray(istruzione.targets)) return { cancellati: 0 };
    const adesso = Date.now();
    for (const bersaglio of istruzione.targets) {
        try {
            const dominio = bersaglio.table === 'users' || bersaglio.table === 'access_logs' ? 'auth' : planner.DOMINIO_ANAGRAFICA;
            _cancellaRiga({ table: bersaglio.table, recordId: bersaglio.recordId, dominio }, adesso);
        } catch (e) {
            console.error('[GdprShred] Cancellazione locale non riuscita per ' + bersaglio.table + ':', e.message);
        }
    }
    return shredder.shredTargets(istruzione.targets, { shreddedAt: adesso });
}

function exportSubject(personaId) {
    const dati = planner.raccogliDati(personaId);
    return {
        success: true,
        formato: 'application/json',
        generatoIl: new Date().toISOString(),
        soggetto: personaId,
        dati
    };
}

module.exports = { eraseSubject, exportSubject, applyRemoteShred, ANONIMO };
