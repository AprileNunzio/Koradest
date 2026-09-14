'use strict';

const DOMINIO_ANAGRAFICA = 'app_anagrafica';
const TABELLE_FIGLIE = [
    'documenti_identita',
    'indirizzi',
    'rapporti_lavoro',
    'titoli_studio',
    'dati_bancari',
    'contatti',
    'familiari'
];

function _db(dominio) {
    return require('../../db').getDB(dominio);
}

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _personaEsistente(personaId) {
    const righe = _db(DOMINIO_ANAGRAFICA).query('SELECT id, user_id FROM persone WHERE id = ?', [personaId]);
    return righe && righe.length > 0 ? righe[0] : null;
}

function pianificaCancellazione(personaId) {
    if (!personaId) throw _expected('GDPR_SUBJECT_REQUIRED');
    const persona = _personaEsistente(personaId);
    if (!persona) throw _expected('GDPR_SUBJECT_NOT_FOUND');

    const anagrafica = _db(DOMINIO_ANAGRAFICA);
    const bersagli = [{ table: 'persone', recordId: personaId, dominio: DOMINIO_ANAGRAFICA }];

    for (const tabella of TABELLE_FIGLIE) {
        const righe = anagrafica.query(`SELECT id FROM ${tabella} WHERE persona_id = ?`, [personaId]);
        for (const riga of righe || []) {
            bersagli.push({ table: tabella, recordId: riga.id, dominio: DOMINIO_ANAGRAFICA });
        }
    }

    const utenteCollegato = persona.user_id ? String(persona.user_id) : '';
    if (utenteCollegato) {
        bersagli.push({ table: 'users', recordId: utenteCollegato, dominio: 'auth' });
        for (const tabella of ['webauthn_credentials', 'totp_backup_codes', 'notification_preferences', 'notifications', 'access_logs']) {
            const righe = _db('auth').query(`SELECT id FROM ${tabella} WHERE user_id = ?`, [utenteCollegato]);
            for (const riga of righe || []) {
                bersagli.push({ table: tabella, recordId: riga.id, dominio: 'auth' });
            }
        }
    }

    return { personaId, utenteCollegato, bersagli };
}

function raccogliDati(personaId) {
    const persona = _personaEsistente(personaId);
    if (!persona) throw _expected('GDPR_SUBJECT_NOT_FOUND');
    const anagrafica = _db(DOMINIO_ANAGRAFICA);
    const esito = { persona: anagrafica.query('SELECT * FROM persone WHERE id = ?', [personaId])[0] || null };
    for (const tabella of TABELLE_FIGLIE) {
        esito[tabella] = anagrafica.query(`SELECT * FROM ${tabella} WHERE persona_id = ?`, [personaId]) || [];
    }
    if (persona.user_id) {
        const utente = _db('auth').query('SELECT id, username, email, nome, cognome, last_login, is_superadmin FROM users WHERE id = ?', [persona.user_id]);
        esito.account = utente && utente.length > 0 ? utente[0] : null;
        esito.accessi = _db('auth').query('SELECT * FROM access_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 500', [persona.user_id]) || [];
    }
    return esito;
}

module.exports = { pianificaCancellazione, raccogliDati, TABELLE_FIGLIE, DOMINIO_ANAGRAFICA };
