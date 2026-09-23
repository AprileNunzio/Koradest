const path = require('path');
const { crea, validaPayload, ErroreApp } = require(path.resolve('backend/core/app_runtime_v2'));

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
const lancia = (funzione) => {
    try {
        funzione();
        return null;
    } catch (errore) {
        return errore;
    }
};

const manifest = {
    id: 'alunni',
    name: 'Alunni',
    version: '1.0.0',
    db: { namespace: 'alunni' },
    rbacPermissions: [{ id: 'lettura', label: 'L' }, { id: 'gestione', label: 'G' }]
};

async function main() {
    const salvataggi = [];
    const righe = [];
    const chiamate = [];
    const dbManager = {
        get: () => ({ query: () => righe, run: (sql, parametri) => righe.push({ sql, parametri }) }),
        save: async (namespace) => salvataggi.push(namespace)
    };
    const permessi = { segreteria: ['alunni:gestione', 'alunni:lettura'], docente: ['alunni:lettura'], admin: ['*'] };
    const broker = {
        routeIpcCall: async (...argomenti) => {
            chiamate.push(argomenti);
            return 'ok';
        },
        registerApiHandler: (app, nome, gestore) => chiamate.push(['registrata', app, nome, gestore])
    };
    const runtime = crea(manifest, {
        dbManager,
        broker,
        permessiUtente: id => permessi[id] || [],
        kernel: { log: { error: () => {} } }
    });
    const k = runtime.api;

    k.azione('alunni.elenco', { ruolo: 'lettura' }, async () => k.db.tutti('SELECT 1'));
    k.azione('alunni.salva', { ruolo: 'gestione', modifica: true, valida: { nome: 'testo!', codice_fiscale: 'codiceFiscale!' } }, async (dati) => ({ id: 'a1', nome: dati.nome }));
    k.azione('alunni.chiSono', async (_dati, ctx) => ({ utente: ctx.utente, ruoli: ctx.ruoli }));
    k.azione('alunni.inoltra', async (_dati, ctx) => ctx.chiama('anagrafica', 'persone.cerca', { q: 'x' }));

    check('un ruolo non dichiarato nel manifest viene rifiutato alla registrazione',
        /non e dichiarato/.test(String(lancia(() => k.azione('alunni.x', { ruolo: 'preside' }, () => null)))));
    check('una stessa azione non si registra due volte',
        /due volte/.test(String(lancia(() => k.azione('alunni.elenco', () => null)))));
    check('un tipo di validazione sconosciuto viene segnalato subito',
        /sconosciuto/.test(String(lancia(() => k.azione('alunni.y', { valida: { eta: 'anni' } }, () => null)))));

    const elenco = await runtime.esegui('alunni.elenco', 'alunni', {}, { userId: 'docente' });
    check('con il ruolo giusto l azione restituisce i dati senza involucro', Array.isArray(elenco));

    const negato = await rifiuta(runtime.esegui('alunni.salva', 'alunni', { nome: 'Luca' }, { userId: 'docente' }));
    check('senza il ruolo richiesto l azione viene negata con un messaggio chiaro', negato instanceof ErroreApp && /gestione/.test(negato.message));

    const anonimo = await rifiuta(runtime.esegui('alunni.elenco', 'alunni', {}, null));
    check('senza utente un azione protetta da ruolo viene negata', anonimo instanceof ErroreApp);

    const invalido = await rifiuta(runtime.esegui('alunni.salva', 'alunni', { nome: 'Luca', codice_fiscale: 'ABC' }, { userId: 'segreteria' }));
    check('i dati non validi vengono respinti prima di arrivare all app', invalido instanceof ErroreApp && /codice_fiscale/.test(invalido.message));
    check('un rifiuto non salva l archivio', salvataggi.length === 0);

    const salvato = await runtime.esegui('alunni.salva', 'alunni', { nome: 'Luca', codice_fiscale: 'RSSMRA85T10A562S' }, { userId: 'segreteria' });
    check('un azione di modifica riuscita salva l archivio', salvato.id === 'a1' && salvataggi[0] === 'alunni');

    const io = await runtime.esegui('alunni.chiSono', 'alunni', {}, { userId: 'admin' });
    check('l amministratore riceve tutti i ruoli dell app', io.utente.id === 'admin' && io.ruoli.length === 2);

    await runtime.esegui('alunni.inoltra', 'alunni', {}, { userId: 'docente' });
    const inoltro = chiamate.find(c => c[1] === 'anagrafica');
    check('una chiamata verso un altra app porta con se l utente', inoltro && inoltro[0] === 'alunni' && inoltro[4].contesto.userId === 'docente');

    runtime.registraNelBroker(broker);
    const registrate = chiamate.filter(c => c[0] === 'registrata').map(c => c[2]);
    check('tutte le azioni vengono registrate nel broker', registrate.length === 6);
    check('il core aggiunge lo storico di audit a ogni app con archivio', registrate.includes('koradest.storico') && registrate.includes('koradest.storico.verifica'));
    check('il prefisso koradest. e riservato al core', lancia(() => k.azione('koradest.furto', async () => null)) !== null);

    const senzaArchivio = crea({ id: 'note', name: 'Note' }, { dbManager, broker, permessiUtente: () => [] });
    check('un app senza "data" riceve un errore esplicito se usa l archivio',
        /data/.test(String(lancia(() => senzaArchivio.api.db.tutti('SELECT 1')))));

    check('la validazione accetta i campi facoltativi assenti', validaPayload({ note: 'testo', eta: 'intero' }, {}).length === 0);
    check('la validazione controlla gli elenchi di valori ammessi', validaPayload({ sesso: { tipo: 'testo', valori: ['M', 'F'] } }, { sesso: 'X' }).length === 1);
}

main().then(() => {
    console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : `\n${failures} CONTROLLI FALLITI`);
    process.exit(failures === 0 ? 0 : 1);
}).catch((errore) => {
    console.error(errore);
    process.exit(1);
});
