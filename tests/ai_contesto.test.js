const path = require('path');
const { creaGateway } = require(path.resolve('backend/ai/gateway/gateway_ai'));
const { creaConfigurazione } = require(path.resolve('backend/ai/gateway/configurazione_ai'));
const { seleziona } = require(path.resolve('backend/ai/gateway/selezione_strumenti'));
const { limita } = require(path.resolve('backend/ai/gateway/limite_risultati'));
const { compatta } = require(path.resolve('backend/ai/gateway/compattazione'));
const dataProtector = require(path.resolve('backend/ai/ollama/OllamaDataProtector'));

let fallimenti = 0;
const controlla = (etichetta, condizione) => {
    console.log(`${condizione ? 'PASS' : 'FAIL'}  ${etichetta}`);
    if (!condizione) fallimenti += 1;
};

const PAROLE = ['viaggio', 'gara', 'lotto', 'fornitore', 'preventivo', 'vettore', 'autista', 'rimborso', 'consenso', 'documento', 'protocollo', 'capitolo', 'impegno', 'determina', 'verbale'];

function registroSintetico() {
    const strumenti = [];
    for (let indice = 0; indice < 280; indice += 1) {
        const parola = PAROLE[indice % PAROLE.length];
        strumenti.push({
            nome: `viaggi_istruzione__${parola}.azione${indice}`,
            descrizione: `Gestisce ${parola} e relativi dettagli amministrativi del viaggio numero ${indice}, con controlli su scadenze, importi, firme, allegati e protocollo.`,
            parametri: { type: 'object', properties: { id: { type: 'string' }, note: { type: 'string', description: 'Note libere lunghe fino a mille caratteri per il fascicolo' } }, required: ['id'] },
            modifica: indice % 3 === 0,
            app: 'viaggi_istruzione'
        });
    }
    [
        ['movimenti.salva', 'Registra o corregge un movimento: entrata o uscita su un conto con categoria, oppure trasferimento fra due conti. Importo in euro', true],
        ['movimenti.elenco', 'Elenca entrate, uscite e trasferimenti di un mese', false],
        ['conti.elenco', 'Elenca i conti della famiglia con il saldo', false],
        ['categorie.elenco', 'Elenca le categorie di entrata e di uscita con il budget', false],
        ['scadenze.registra_pagamento', 'Segna come pagata una scadenza registrando il movimento', true]
    ].forEach(([azione, descrizione, modifica]) => strumenti.push({
        nome: `app_bilancio_familiare__${azione}`,
        descrizione,
        parametri: { type: 'object', properties: { importo: { type: 'number' }, conto_id: { type: 'string' } }, required: [] },
        modifica,
        app: 'app_bilancio_familiare'
    }));
    return strumenti;
}

const comeRegistro = strumenti => ({
    getToolsForUser: () => strumenti.map(s => ({ type: 'function', function: { name: s.nome, description: s.descrizione, parameters: s.parametri } })),
    getTool: nome => {
        const trovato = strumenti.find(s => s.nome === nome);
        return trovato ? { metadata: { modifica: trovato.modifica, nomeApp: trovato.app, descrizioneApp: `Applicazione ${trovato.app}` } } : null;
    }
});

async function main() {
    const strumenti = registroSintetico();
    const totale = JSON.stringify(strumenti).length;
    const selezionati = seleziona({ strumenti, richiesta: 'Jarvis mi aggiungi 30€ di spesa ai movimenti?', massimo: 12, budgetCaratteri: 9830 });
    controlla('con 285 strumenti la richiesta di spesa seleziona movimenti.salva', selezionati.some(s => s.nome === 'app_bilancio_familiare__movimenti.salva'));
    controlla('insieme allo strumento di scrittura arrivano gli elenchi per trovare conti e categorie', ['conti.elenco', 'categorie.elenco'].every(a => selezionati.some(s => s.nome.endsWith(a))));
    controlla('la selezione resta nel budget e taglia di oltre il 90% il peso', JSON.stringify(selezionati).length <= 9830 && JSON.stringify(selezionati).length < totale / 10);
    controlla('aggiungi non viene confuso con aggiudica', !selezionati.some(s => /aggiud/.test(s.nome)));

    const lungo = Array.from({ length: 500 }, (_, i) => ({ id: `m${i}`, descrizione: 'Spesa al supermercato con molti dettagli' }));
    const troncato = limita(lungo, 4000);
    controlla('un elenco troppo lungo viene troncato indicando il totale', troncato.totale === 500 && troncato.mostrati > 0 && JSON.stringify(troncato).length <= 4000);

    const conversazione = [{ ruolo: 'sistema', testo: 'x' }, ...Array.from({ length: 6 }, (_, i) => ({ ruolo: 'strumento', risultato: { id: `r${i}`, nome: 'a__b', dati: 'd'.repeat(3000) } }))];
    const compattata = compatta(conversazione, 8000);
    controlla('la compattazione riduce i risultati più vecchi fino a stare nel budget', JSON.stringify(compattata).length <= 8000 && compattata[1].risultato.dati.compattato && !compattata[6].risultato.dati.compattato);

    const richieste = [];
    const eseguite = [];
    const copione = [
        () => ({ testo: '', chiamate: [{ id: '1', nome: 'koradest__elenco_app', argomenti: {} }] }),
        () => ({ testo: '', chiamate: [{ id: '2', nome: 'koradest__strumenti_app', argomenti: { app: 'app_bilancio_familiare', cerca: 'pagamento' } }] }),
        () => ({ testo: '', chiamate: [{ id: '3', nome: 'koradest__carica_strumenti', argomenti: { nomi: ['app_bilancio_familiare__scadenze.registra_pagamento', 'inventato__x'] } }] }),
        () => ({ testo: '', chiamate: [{ id: '4', nome: 'app_bilancio_familiare__scadenze.registra_pagamento', argomenti: { importo: 30 } }] }),
        () => ({ testo: 'Fatto: pagamento registrato.', chiamate: [] })
    ];
    const fornitore = {
        nome: 'finto',
        esterno: false,
        chat: async ({ messaggi, strumenti: offerti }) => {
            richieste.push({ caratteri: JSON.stringify({ messaggi, offerti }).length, offerti: offerti.map(s => s.nome), messaggi });
            return copione[richieste.length - 1]();
        }
    };
    const gateway = creaGateway({
        configurazione: creaConfigurazione({ leggiConfig: () => ({ ai: { fornitore: 'ollama', contestoMassimo: 8192, strumentiMassimi: 8, confermaScritture: false } }), aggiornaSezione: () => null }),
        cassaforte: { leggi: () => null, descrivi: () => ({ configurata: false }) },
        fornitori: { crea: () => fornitore },
        hostOllama: () => 'http://127.0.0.1:11434',
        toolRegistry: comeRegistro(strumenti),
        rbacGuard: { validateExecution: () => ({ allowed: true }) },
        dataProtector,
        broker: { routeIpcCall: async (sorgente, app, azione, dati) => { eseguite.push(`${app}__${azione}`); return { id: 'mov-1', dati }; } },
        audit: () => null
    });
    const risposta = await gateway.chiedi({ utente: { id: 'u1', role: 'user', permissions: ['*'] }, prompt: 'Segna come pagata la bolletta della luce di oggi' });
    const limite = 8192 * 3;
    controlla('ogni passo verso il modello resta sotto il contesto massimo', richieste.every(r => r.caratteri < limite));
    controlla('il primo passo offre il manuale oltre agli strumenti preselezionati', richieste[0].offerti.includes('koradest__elenco_app') && richieste[0].offerti.length <= 3 + 8);
    const elencoApp = richieste[1].messaggi.find(m => m.ruolo === 'strumento').risultato.dati.dati;
    controlla('il manuale elenca le app con quanti strumenti hanno', Array.isArray(elencoApp) && elencoApp.some(a => a.app === 'viaggi_istruzione' && a.strumenti === 280));
    const strumentiApp = richieste[2].messaggi.filter(m => m.ruolo === 'strumento')[1].risultato.dati.dati;
    controlla('il manuale trova lo strumento cercato nell app', strumentiApp.strumenti.some(s => s.nome === 'app_bilancio_familiare__scadenze.registra_pagamento'));
    const caricamento = richieste[3].messaggi.filter(m => m.ruolo === 'strumento')[2].risultato.dati.dati;
    controlla('il caricamento rifiuta nomi inesistenti', caricamento.caricati.length === 1 && caricamento.non_trovati[0] === 'inventato__x');
    controlla('dopo il caricamento lo strumento è offerto al modello', richieste[3].offerti.includes('app_bilancio_familiare__scadenze.registra_pagamento'));
    controlla('lo strumento caricato viene eseguito davvero', eseguite.includes('app_bilancio_familiare__scadenze.registra_pagamento'));
    controlla('la risposta finale arriva all utente', risposta.success && risposta.content === 'Fatto: pagamento registrato.' && risposta.passi === 5);
    controlla('le istruzioni operative contengono la data di oggi', richieste[0].messaggi[0].testo.includes(new Date().toISOString().slice(0, 10)));

    console.log(fallimenti === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : `\n${fallimenti} CONTROLLI FALLITI`);
    process.exit(fallimenti === 0 ? 0 : 1);
}

main().catch((errore) => {
    console.error(errore);
    process.exit(1);
});
