const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { crea } = require(path.resolve('backend/core/app_runtime_v2'));
const fieldAudit = require(path.resolve('backend/core/field_audit'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const rifiuta = async (promessa) => {
    try {
        await promessa;
        return null;
    } catch (errore) {
        return errore;
    }
};

function archivioInMemoria() {
    const db = new DatabaseSync(':memory:');
    return {
        db,
        query: (sql, parametri = []) => db.prepare(sql).all(...[].concat(parametri)),
        run: (sql, parametri = []) => db.prepare(sql).run(...[].concat(parametri))
    };
}

const manifest = {
    id: 'alunni',
    name: 'Alunni',
    version: '3.0.0',
    db: { namespace: 'alunni' },
    rbacPermissions: [{ id: 'consultazione', label: 'C', default: true }, { id: 'segreteria', label: 'S' }]
};

async function main() {
    const archivio = archivioInMemoria();
    archivio.run('CREATE TABLE alunni (id TEXT PRIMARY KEY, cognome TEXT, nome TEXT, classe_id TEXT, foto BLOB)');
    archivio.run('CREATE TABLE note (id INTEGER PRIMARY KEY AUTOINCREMENT, alunno_id TEXT, testo TEXT)');
    archivio.run('CREATE TABLE impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)');

    const repliche = [];
    const permessi = { segretaria: ['alunni:segreteria'], esterno: ['store:view'], docente: ['alunni:view'] };
    const runtime = crea(manifest, {
        dbManager: { get: () => archivio, save: async () => true },
        broker: { routeIpcCall: async () => null },
        permessiUtente: id => permessi[id] || [],
        replica: (azione, tabella, id, riga) => repliche.push({ azione, tabella, id, riga }),
        risolviNomiOperatori: identificativi => Object.fromEntries(identificativi.filter(Boolean).map(id => [id, `Utente ${id}`])),
        kernel: { log: { error: () => {} } }
    });
    const k = runtime.api;

    k.azione('alunni.salva', { ruolo: 'segreteria', modifica: true }, async (dati) => {
        k.db.esegui('INSERT INTO alunni (id, cognome, nome) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET cognome = excluded.cognome, nome = excluded.nome', [dati.id, dati.cognome, dati.nome]);
        return { id: dati.id };
    });
    k.azione('alunni.aggiorna', { ruolo: 'segreteria', modifica: true }, async (dati) => {
        k.db.esegui('UPDATE alunni SET classe_id = (SELECT ?) WHERE id IN (SELECT id FROM alunni WHERE cognome = ?)', [dati.classe, dati.cognome]);
        return true;
    });
    k.azione('alunni.nota', { ruolo: 'segreteria', modifica: true }, async (dati) => {
        k.db.esegui('INSERT INTO note (alunno_id, testo) VALUES (?, ?)', [dati.id, dati.testo]);
        return true;
    });
    k.azione('alunni.fallisce', { ruolo: 'segreteria', modifica: true }, async (dati) => {
        k.db.transazione(() => {
            k.db.esegui('UPDATE alunni SET nome = ? WHERE id = ?', ['Errato', dati.id]);
            k.db.transazione(() => k.db.esegui('INSERT INTO note (alunno_id, testo) VALUES (?, ?)', [dati.id, 'annidata']));
            throw new Error('interrotta');
        });
    });
    k.azione('alunni.elimina', { ruolo: 'segreteria', modifica: true }, async (dati) => k.db.esegui('DELETE FROM alunni WHERE id = ?', [dati.id]));
    k.azione('alunni.impostazione', { ruolo: 'segreteria', modifica: true }, async () => k.db.esegui("INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('anno', '2026')"));
    k.azione('alunni.foto', { ruolo: 'segreteria', modifica: true }, async (dati) => k.db.esegui('UPDATE alunni SET foto = ? WHERE id = ?', [Buffer.from([1, 2, 3]), dati.id]));

    await runtime.esegui('alunni.salva', 'alunni', { id: 'a1', cognome: 'Rossi', nome: 'Anna' }, { userId: 'segretaria' });
    check('un upsert ON CONFLICT viene replicato', repliche.length === 1 && repliche[0].azione === 'INSERT' && repliche[0].riga.cognome === 'Rossi');

    await runtime.esegui('alunni.salva', 'alunni', { id: 'a1', cognome: 'Rossi', nome: 'Anna Maria' }, { userId: 'segretaria' });
    check('il ramo DO UPDATE di un upsert viene replicato come modifica', repliche.length === 2 && repliche[1].azione === 'UPDATE' && repliche[1].riga.nome === 'Anna Maria');

    await runtime.esegui('alunni.aggiorna', 'alunni', { classe: '3B', cognome: 'Rossi' }, { userId: 'segretaria' });
    check('un UPDATE con sottoquery nel WHERE viene replicato', repliche.length === 3 && repliche[2].riga.classe_id === '3B');

    await runtime.esegui('alunni.nota', 'alunni', { id: 'a1', testo: 'Ottimo' }, { userId: 'segretaria' });
    check('un INSERT senza colonna id viene replicato con l id generato', repliche.length === 4 && repliche[3].tabella === 'note' && repliche[3].id === 1);

    await runtime.esegui('alunni.impostazione', 'alunni', {}, { userId: 'segretaria' });
    check('le tabelle senza colonna id non vengono tracciate', repliche.length === 4);

    const errore = await rifiuta(runtime.esegui('alunni.fallisce', 'alunni', { id: 'a1' }, { userId: 'segretaria' }));
    const nome = archivio.query("SELECT nome FROM alunni WHERE id = 'a1'")[0].nome;
    const annidate = archivio.query("SELECT COUNT(*) AS n FROM note WHERE testo = 'annidata'")[0].n;
    check('una transazione fallita annulla dati, transazioni annidate e repliche', errore && nome === 'Anna Maria' && annidate === 0 && repliche.length === 4);

    await runtime.esegui('alunni.foto', 'alunni', { id: 'a1' }, { userId: 'segretaria' });
    check('le colonne BLOB vengono replicate con il valore originale', ArrayBuffer.isView(repliche[4].riga.foto) && repliche[4].riga.foto.length === 3);

    archivio.run("UPDATE alunni SET nome = 'Remoto' WHERE id = 'a1'");
    check('le scritture fuori dalle azioni (repliche in arrivo) non rientrano in circolo', repliche.length === 5);

    const storicoNome = await runtime.esegui('koradest.storico', 'alunni', { tabella: 'alunni', id: 'a1', campo: 'nome' }, { userId: 'segretaria' });
    check('lo storico del campo elenca inserimento e modifica, dal piu recente', storicoNome.length === 2 && storicoNome[0].dopo === 'Anna Maria' && storicoNome[0].prima === 'Anna' && storicoNome[1].azione === 'INSERT');
    check('ogni voce dello storico riporta l operatore', storicoNome.every(voce => voce.operatoreId === 'segretaria'));

    await runtime.esegui('alunni.elimina', 'alunni', { id: 'a1' }, { userId: 'segretaria' });
    const dopoEliminazione = await runtime.esegui('koradest.storico', 'alunni', { tabella: 'alunni', id: 'a1', campo: 'nome' }, { userId: 'segretaria' });
    check('l eliminazione del record compare nello storico di ogni campo', dopoEliminazione[0].azione === 'DELETE' && dopoEliminazione[0].campo === '*');
    check('l eliminazione viene replicata', repliche[repliche.length - 1].azione === 'DELETE');

    const integra = await runtime.esegui('koradest.storico.verifica', 'alunni', {}, { userId: 'segretaria' });
    check('la catena delle impronte e integra', integra.integra === true && integra.verificate > 0);

    const manomissione = await rifiuta(Promise.resolve().then(() => archivio.run("UPDATE _k_audit SET dopo = '\"Falso\"' WHERE seq = 1")));
    check('il registro di audit rifiuta modifiche', manomissione !== null);
    archivio.run('DROP TRIGGER _k_audit_immutabile_upd');
    archivio.run("UPDATE _k_audit SET dopo = '\"Falso\"' WHERE seq = 1");
    check('una manomissione diretta viene rilevata dalla catena', fieldAudit.verifica(archivio).integra === false && fieldAudit.verifica(archivio).primaVoceAlterata === 1);

    const estraneo = await rifiuta(runtime.esegui('koradest.storico', 'alunni', { tabella: 'alunni', id: 'a1' }, { userId: 'esterno' }));
    check('chi non ha accesso all app non legge lo storico', estraneo && estraneo.codice === 'RUOLO_MANCANTE');

    const interna = await rifiuta(runtime.esegui('koradest.storico', 'alunni', { tabella: '_k_audit', id: '1' }, { userId: 'segretaria' }));
    check('lo storico rifiuta le tabelle interne', interna && interna.codice === 'DATI_NON_VALIDI');

    const iniezione = await rifiuta(runtime.esegui('koradest.storico', 'alunni', { tabella: 'alunni; DROP TABLE alunni', id: '1' }, { userId: 'segretaria' }));
    check('lo storico rifiuta nomi di tabella non sicuri', iniezione && iniezione.codice === 'DATI_NON_VALIDI');

    const docente = await runtime.esegui('koradest.storico', 'alunni', { tabella: 'alunni', id: 'a1' }, { userId: 'docente' });
    check('il ruolo predefinito vale per chi ha accesso all app', Array.isArray(docente));

    k.azione('alunni.chiSono', async (_dati, ctx) => ctx.ruoli);
    const ruoliEsterno = await runtime.esegui('alunni.chiSono', 'alunni', {}, { userId: 'esterno' });
    check('il ruolo predefinito non viene concesso a chi non ha accesso all app', ruoliEsterno.length === 0);

    archivio.run('ALTER TABLE note ADD COLUMN autore TEXT');
    k.azione('alunni.notaFirmata', { ruolo: 'segreteria', modifica: true }, async () => k.db.esegui("INSERT INTO note (alunno_id, testo, autore) VALUES ('a2', 'x', 'Bianchi')"));
    await runtime.esegui('alunni.notaFirmata', 'alunni', {}, { userId: 'segretaria' });
    check('una colonna aggiunta dopo l avvio viene tracciata', repliche[repliche.length - 1].riga.autore === 'Bianchi');

    console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : `\n${failures} CONTROLLI FALLITI`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((errore) => {
    console.error(errore);
    process.exit(1);
});
