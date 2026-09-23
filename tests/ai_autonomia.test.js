const path = require('path');
const { interpreta } = require(path.resolve('backend/ai/gateway/interpretazione_azioni'));
const { definizioni, definizioniSenzaContratto } = require(path.resolve('backend/ai/gateway/strumenti_runtime'));
const { normalizza } = require(path.resolve('backend/ai/gateway/configurazione_ai'));
const { creaGateway } = require(path.resolve('backend/ai/gateway/gateway_ai'));
const { creaConfigurazione } = require(path.resolve('backend/ai/gateway/configurazione_ai'));
const dataProtector = require(path.resolve('backend/ai/ollama/OllamaDataProtector'));

let fallimenti = 0;
const controlla = (etichetta, condizione) => {
    console.log(`${condizione ? 'PASS' : 'FAIL'}  ${etichetta}`);
    if (!condizione) fallimenti += 1;
};

async function main() {
    controlla('un nome in inglese camelCase viene capito come scrittura', interpreta('saveTransaction').scrive === true && interpreta('saveTransaction').entita === 'transaction');
    controlla('un elenco viene capito come lettura', interpreta('pazienti.elenco').scrive === false && interpreta('getAllPatients').scrive === false);
    controlla('una cancellazione viene capita come scrittura', interpreta('ordini.cancella').scrive === true);
    controlla('un nome senza verbo resta indeciso', interpreta('magia').scrive === null);

    const [cancella] = definizioni({ appId: 'x', nomeApp: 'X', azioni: [{ nome: 'ordini.cancella', ruoli: [], valida: { id: 'id!' }, modifica: false }] });
    controlla('un azione di scrittura dimenticata senza modifica viene comunque trattata come scrittura', cancella.metadata.modifica === true);
    controlla('senza descrizione il core ne genera una con i parametri', /Elimina o archivia ordini/.test(cancella.function.description) && /Parametri: id/.test(cancella.function.description));

    const vecchie = definizioniSenzaContratto({ appId: 'vecchia', nomeApp: 'Vecchia', nomiAzioni: ['getDashboardStats', 'saveTransaction', 'saveTransaction', 'magia', 'nome non valido!'] });
    controlla('le app senza contratto ottengono strumenti deduplicati e con nomi validi', vecchie.length === 3);
    controlla('nelle app senza contratto ciò che non si capisce è trattato come scrittura', vecchie.find(s => s.function.name === 'vecchia__magia').metadata.modifica === true);

    const predefinita = normalizza({});
    controlla('di default Jarvis va chiesto e il modello non si precarica', predefinita.jarvis === 'da_chiedere' && predefinita.precaricaAllAvvio === false && predefinita.mantieniInMemoria === '5m');
    const sporca = normalizza({ jarvis: 'forse', mantieniInMemoria: '99y', precaricaAllAvvio: 'si', inviaContestoPagina: 0 });
    controlla('valori non ammessi tornano ai predefiniti', sporca.jarvis === 'da_chiedere' && sporca.mantieniInMemoria === '5m' && sporca.precaricaAllAvvio === false && sporca.inviaContestoPagina === true);

    let configAi = { jarvis: 'disattivo', precaricaAllAvvio: true };
    const memoria = [];
    const gateway = creaGateway({
        configurazione: creaConfigurazione({ leggiConfig: () => ({ ai: configAi }), aggiornaSezione: (nome, modifica) => { configAi = modifica(configAi); return configAi; } }),
        cassaforte: { leggi: () => null, descrivi: () => ({ configurata: false }) },
        fornitori: { crea: () => ({ nome: 'finto', esterno: false, carica: async () => { memoria.push('carica'); return { supportato: true, modello: 'm' }; }, libera: async () => ({ supportato: true }), chat: async () => ({ testo: 'ok', chiamate: [] }) }) },
        hostOllama: () => 'http://127.0.0.1:11434',
        toolRegistry: { getToolsForUser: () => [], getTool: () => null },
        rbacGuard: { validateExecution: () => ({ allowed: true }) },
        dataProtector,
        broker: { routeIpcCall: async () => null },
        audit: () => null
    });
    const bloccata = await gateway.chiedi({ utente: { id: 'u', role: 'user' }, prompt: 'ciao' });
    controlla('con Jarvis disattivato il core rifiuta le richieste anche se arrivano', bloccata.success === false && /disattivato/.test(bloccata.error));
    controlla('con Jarvis disattivato il modello non viene precaricato', (await gateway.avvio()).precaricato === false && memoria.length === 0);
    gateway.configura({ jarvis: 'attivo' });
    controlla('con Jarvis attivo e precaricamento abilitato il modello si carica all avvio', (await gateway.avvio()).precaricato === true && memoria.length === 1);
    controlla('lo stato di Jarvis dice se l utente può decidere', gateway.statoJarvis(false).puoDecidere === false && gateway.statoJarvis(true).stato === 'attivo');
    controlla('con Jarvis attivo le richieste passano', (await gateway.chiedi({ utente: { id: 'u', role: 'user' }, prompt: 'ciao' })).success === true);

    console.log(fallimenti === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : `\n${fallimenti} CONTROLLI FALLITI`);
    process.exit(fallimenti === 0 ? 0 : 1);
}

main().catch((errore) => {
    console.error(errore);
    process.exit(1);
});
