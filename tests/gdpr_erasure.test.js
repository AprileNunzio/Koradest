const Module = require('module');
const path = require('path');
const { creaAmbiente } = require('./helpers/db_reale');

const migrazioni = {
    auth: require(path.resolve('backend/migrations/auth')),
    app_anagrafica: require(path.resolve('backend/migrations/anagrafica')),
    ledger: require(path.resolve('backend/migrations/ledger')),
    audit: require(path.resolve('backend/migrations/audit'))
};
const ambiente = creaAmbiente(migrazioni);

const originalLoad = Module._load;
Module._load = function (request, parent) {
    if (request === 'electron') return { app: { getPath: () => '.', on: () => {} }, BrowserWindow: { getAllWindows: () => [] } };
    const risolto = request.replace(/\\/g, '/');
    if (risolto.endsWith('/db') && parent && parent.filename && parent.filename.includes('backend')) return ambiente.stub;
    if (risolto.endsWith('security/developer_vault')) return { deleteRecordMutations: async () => true, logMutation: async () => true };
    if (risolto.endsWith('observability/auditLogger')) return { logEvent: () => true };
    return originalLoad.apply(this, arguments);
};

const gdpr = require(path.resolve('backend/security/gdprManager'));
const eraser = require(path.resolve('backend/security/gdpr/subject_eraser'));
const shredder = require(path.resolve('backend/dag/security/payload_shredder'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const errore = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };

const auth = ambiente.database.auth;
const anagrafica = ambiente.database.app_anagrafica;
const ledger = ambiente.database.ledger;

const PERSONA = 'persona-1';
const UTENTE = 'utente-1';
const adesso = Date.now();

auth.run('INSERT INTO users (id, username, password, passkey, last_modified, is_deleted, email, pin, nome, cognome, is_superadmin) VALUES (?,?,?,?,?,0,?,?,?,?,0)',
    [UTENTE, 'Rossi Mario', 'hash-pw', '', adesso, 'mario.rossi@example.it', 'hash-pin', 'Mario', 'Rossi']);
anagrafica.run('INSERT INTO persone (id, codice_fiscale, nome, cognome, email_principale, last_modified, is_deleted, user_id) VALUES (?,?,?,?,?,?,0,?)',
    [PERSONA, 'RSSMRA80A01H501U', 'Mario', 'Rossi', 'mario.rossi@example.it', adesso, UTENTE]);
anagrafica.run('INSERT INTO contatti (id, persona_id, categoria, tipo, valore, last_modified, is_deleted) VALUES (?,?,?,?,?,?,0)',
    ['contatto-1', PERSONA, 'personale', 'email', 'mario.rossi@example.it', adesso]);
anagrafica.run('INSERT INTO dati_bancari (id, persona_id, iban, last_modified, is_deleted) VALUES (?,?,?,?,0)',
    ['banca-1', PERSONA, 'IT60X0542811101000000123456', adesso]);
anagrafica.run('INSERT INTO documenti_identita (id, persona_id, tipo, numero, last_modified, is_deleted) VALUES (?,?,?,?,?,0)',
    ['doc-1', PERSONA, 'CI', 'AB1234567', adesso]);

const inserisciBlocco = (blockId, tabella, recordId, payload) => {
    ledger.run('INSERT INTO event_log (block_id, parent_ids, event_type, table_name, record_id, payload, node_id, created_at, payload_version, is_applied) VALUES (?,?,?,?,?,?,?,?,1,1)',
        [blockId, '[]', 'INSERT', tabella, recordId, JSON.stringify(payload), 'nodo-1', adesso]);
};
inserisciBlocco('b1', 'persone', PERSONA, { id: PERSONA, nome: 'Mario', cognome: 'Rossi', codice_fiscale: 'RSSMRA80A01H501U', is_deleted: 0 });
inserisciBlocco('b2', 'contatti', 'contatto-1', { id: 'contatto-1', persona_id: PERSONA, valore: 'mario.rossi@example.it', is_deleted: 0 });
inserisciBlocco('b3', 'dati_bancari', 'banca-1', { id: 'banca-1', persona_id: PERSONA, iban: 'IT60X0542811101000000123456', is_deleted: 0 });
inserisciBlocco('b4', 'users', UTENTE, { id: UTENTE, username: 'Rossi Mario', email: 'mario.rossi@example.it', password: 'hash-pw', is_deleted: 0 });
inserisciBlocco('b5', 'persone', 'persona-estranea', { id: 'persona-estranea', nome: 'Anna', cognome: 'Verdi', is_deleted: 0 });

console.log('--- anteprima ---');
const anteprima = gdpr.previewErasure(PERSONA);
check('l anteprima trova la persona e le sue righe collegate', anteprima.totaleRighe >= 5);
check('l anteprima riconosce l account collegato', anteprima.utenteCollegato === UTENTE);
check('l anteprima conta i blocchi ancora leggibili nel registro', anteprima.blocchiNelRegistro >= 4);

console.log('\n--- esportazione (portabilita) ---');
const esportazione = gdpr.exportSubjectData(PERSONA);
check('l esportazione riesce', esportazione.success === true);
check('l esportazione contiene i dati anagrafici', esportazione.dati.persona && esportazione.dati.persona.codice_fiscale === 'RSSMRA80A01H501U');
check('l esportazione contiene i dati bancari', esportazione.dati.dati_bancari.length === 1);
check('l esportazione contiene l account', esportazione.dati.account && esportazione.dati.account.username === 'Rossi Mario');

console.log('\n--- cancellazione ---');
let esito = null;
const attesa = gdpr.eraseSubjectData(PERSONA, 'admin-1').then(r => { esito = r; });

attesa.then(() => {
    check('la cancellazione riporta successo', esito.success === true);
    check('dichiara quanti blocchi ha reso illeggibili', esito.blocchiCancellati >= 4);
    check('non lascia blocchi leggibili per il soggetto', esito.residuiNelRegistro === 0);

    const personaDopo = anagrafica.query('SELECT is_deleted FROM persone WHERE id = ?', [PERSONA]);
    check('la persona risulta cancellata', personaDopo[0].is_deleted === 1);
    const contattoDopo = anagrafica.query('SELECT is_deleted FROM contatti WHERE id = ?', ['contatto-1']);
    check('i contatti risultano cancellati', contattoDopo[0].is_deleted === 1);
    const bancaDopo = anagrafica.query('SELECT is_deleted FROM dati_bancari WHERE id = ?', ['banca-1']);
    check('i dati bancari risultano cancellati', bancaDopo[0].is_deleted === 1);

    const utenteDopo = auth.query('SELECT username, email, nome, password, is_deleted FROM users WHERE id = ?', [UTENTE])[0];
    check('l account e anonimizzato', utenteDopo.nome === eraser.ANONIMO && utenteDopo.email === '');
    check('le credenziali dell account sono azzerate', utenteDopo.password === '');
    check('l account e disattivato', utenteDopo.is_deleted === 1);

    const blocchi = ledger.query('SELECT block_id, payload, payload_state FROM event_log ORDER BY block_id');
    const perId = Object.fromEntries(blocchi.map(b => [b.block_id, b]));
    check('il blocco della persona e stato reso illeggibile', perId.b1.payload_state === 'shredded' && shredder.isTombstone(perId.b1.payload));
    check('il blocco del contatto e stato reso illeggibile', perId.b2.payload_state === 'shredded');
    check('il blocco bancario non contiene piu l IBAN', !perId.b3.payload.includes('IT60X0542811101'));
    check('il blocco dell account e stato reso illeggibile', perId.b4.payload_state === 'shredded');
    check('il blocco di un altra persona resta intatto', perId.b5.payload_state === 'plain' && perId.b5.payload.includes('Anna'));

    check('nessun blocco conserva il codice fiscale', !blocchi.some(b => b.payload.includes('RSSMRA80A01H501U')));
    check('nessun blocco conserva l email del soggetto', !blocchi.some(b => b.payload.includes('mario.rossi@example.it')));

    const istruzione = ambiente.blocchiCreati.find(b => b.eventType === 'SHRED');
    check('viene emesso un blocco SHRED per la replica', Boolean(istruzione));
    check('il blocco SHRED elenca i bersagli', istruzione.payload.targets.length === anteprima.totaleRighe);
    check('il blocco SHRED non contiene dati personali', !JSON.stringify(istruzione.payload).includes('mario.rossi@example.it'));

    console.log('\n--- idempotenza e replica ---');
    const seconda = eraser.applyRemoteShred(istruzione.payload);
    check('riapplicare la cancellazione non produce nuovi effetti', seconda.cancellati === 0);

    const statistiche = gdpr.ledgerStats();
    check('le statistiche del registro distinguono i blocchi cancellati', statistiche.registro.shredded >= 4 && statistiche.registro.plain >= 1);

    console.log('\n--- casi limite ---');
    check('rifiuta un soggetto inesistente', errore(() => gdpr.previewErasure('non-esiste')) === 'GDPR_SUBJECT_NOT_FOUND');
    check('rifiuta una richiesta senza soggetto', errore(() => gdpr.previewErasure('')) === 'GDPR_SUBJECT_REQUIRED');

    console.log('\n--- ricostruzione dello stato dal registro ---');
    const applier = require(path.resolve('backend/dag/application/block_applier'));
    anagrafica.run('DELETE FROM persone');
    anagrafica.run('DELETE FROM contatti');
    const blocchiRegistro = ledger.query('SELECT * FROM event_log');
    for (const riga of blocchiRegistro) {
        applier.reapplyToTables({
            block_id: riga.block_id,
            parent_ids: JSON.parse(riga.parent_ids),
            event_type: riga.event_type,
            table_name: riga.table_name,
            record_id: riga.record_id,
            payload: JSON.parse(riga.payload),
            node_id: riga.node_id,
            created_at: riga.created_at,
            payload_version: riga.payload_version
        });
    }
    const risorte = anagrafica.query('SELECT id FROM persone WHERE id = ?', [PERSONA]);
    check('la ricostruzione non fa risorgere il soggetto cancellato', risorte.length === 0);
    const contattiRisorti = anagrafica.query('SELECT id FROM contatti WHERE persona_id = ?', [PERSONA]);
    check('la ricostruzione non fa risorgere i dati collegati', contattiRisorti.length === 0);
    const altraPersona = anagrafica.query('SELECT id FROM persone WHERE id = ?', ['persona-estranea']);
    check('la ricostruzione ripristina le persone non cancellate', altraPersona.length === 1);

    console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
    process.exit(failures === 0 ? 0 : 1);
}).catch(e => {
    console.error('ERRORE NEL TEST:', e);
    process.exit(1);
});
