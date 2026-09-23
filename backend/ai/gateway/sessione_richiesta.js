'use strict';

const cicloAgente = require('./ciclo_agente');
const schemaStrumenti = require('./schema_strumenti');
const { creaEsecutore } = require('./esecutore_strumenti');
const { seleziona, famigliaDi } = require('./selezione_strumenti');
const { creaManuale } = require('./manuale_strumenti');
const { creaInsieme } = require('./insieme_strumenti');
const { creaVerifica } = require('./verifica_risposta');
const { creaStrumentiMemoria } = require('./apprendimento/strumenti_memoria');

const CARATTERI_PER_TOKEN = 3;
const QUOTA_STRUMENTI = 0.4;
const QUOTA_RISULTATO = 0.2;
const MASSIMO_PASSI_PIANO = 6;

function istruzioniOperative(adesso = new Date()) {
    const oggi = adesso.toISOString().slice(0, 10);
    return [
        '[ISTRUZIONI OPERATIVE]',
        `Oggi è il ${oggi}. Le date si scrivono nel formato AAAA-MM-GG.`,
        'Per registrare o modificare dati usa sempre gli strumenti: non dire di averlo fatto se nessuno strumento lo ha confermato.',
        'Se ti serve un identificativo (conto, categoria, persona), cercalo prima con lo strumento di elenco della stessa app.',
        'Se gli strumenti che hai non bastano, consulta il manuale: koradest__elenco_app, poi koradest__strumenti_app, poi koradest__carica_strumenti con i nomi che ti servono.',
        'Se uno strumento restituisce un errore, leggilo, correggi i parametri e riprova una volta prima di arrenderti.',
        'Se mancano informazioni indispensabili e non puoi dedurle, chiedile in una sola domanda.',
        'Rispondi in italiano, in modo breve.'
    ].join('\n');
}

const pianoAppreso = piano => (piano
    ? `[ESPERIENZA] Per richieste simili ha funzionato ${piano.successi} volte questa sequenza di strumenti: ${piano.sequenza.slice(0, MASSIMO_PASSI_PIANO).join(' → ')}. Seguila se è adatta, adattala se la richiesta è diversa.`
    : '');

function descriviChiamata(chiamata, strumento) {
    return {
        strumento: chiamata.nome,
        app: (strumento && strumento.nomeApp) || schemaStrumenti.scomponi(chiamata.nome).appId,
        descrizione: strumento ? String(strumento.descrizione).split(' [Esperienza:')[0].slice(0, 200) : chiamata.nome,
        argomenti: chiamata.argomenti || {}
    };
}

function creaSessione({ conf, fornitore, utente, testo, sistema, appAttiva, dipendenze }) {
    const { toolRegistry, rbacGuard, dataProtector, broker, audit, apprendimento } = dipendenze;
    const impara = conf.apprendimento && apprendimento;
    const caratteriContesto = conf.contestoMassimo * CARATTERI_PER_TOKEN;
    const budgetStrumenti = Math.floor(caratteriContesto * QUOTA_STRUMENTI);
    const grezzi = schemaStrumenti.daRegistro(toolRegistry.getToolsForUser(utente), nome => (toolRegistry.getTool(nome) || {}).metadata);
    const disponibili = impara ? grezzi.map(apprendimento.arricchisci) : grezzi;
    const perNome = new Map(disponibili.map(strumento => [strumento.nome, strumento]));
    const suggeriti = impara ? apprendimento.suggerimenti(testo) : { pesi: new Map(), piano: null };
    const preselezionati = seleziona({ strumenti: disponibili, richiesta: testo, appAttiva, massimo: conf.strumentiMassimi, budgetCaratteri: budgetStrumenti, pesiAppresi: suggeriti.pesi });
    const insieme = creaInsieme({ iniziali: preselezionati, fissi: [], budgetCaratteri: budgetStrumenti });
    const manuale = creaManuale({ disponibili, richiesta: testo, insieme });
    const memoria = conf.memoriaUtente && apprendimento ? creaStrumentiMemoria({ apprendimento, utenteId: utente.id }) : null;
    const interni = [memoria].filter(Boolean);
    const strumenti = () => [...manuale.definizioni, ...interni.flatMap(interno => interno.definizioni), ...insieme.elenco()];
    const scrive = nome => Boolean(perNome.get(nome) && perNome.get(nome).modifica);
    const ricordi = conf.memoriaUtente && apprendimento ? apprendimento.istruzioniUtente(utente.id) : '';
    const ricordiProtetti = fornitore.esterno && ricordi ? dataProtector.sanitizeModelOutput(ricordi) : ricordi;

    const parametri = {
        fornitore,
        modello: conf.modelli[conf.fornitore],
        strumenti,
        eseguiStrumento: creaEsecutore({
            utente,
            fornitoreEsterno: fornitore.esterno,
            toolRegistry,
            rbacGuard,
            dataProtector,
            broker,
            registraEvento: (strumento, esito, dettagli) => audit(utente.id, 'AI_TOOL_CALL', 'ai', strumento, { fornitore: fornitore.nome, ...(dettagli || {}) }, esito),
            massimoCaratteri: Math.floor(caratteriContesto * QUOTA_RISULTATO),
            manuale,
            interni
        }),
        passiMassimi: conf.passiMassimi,
        budgetConversazione: Math.floor(caratteriContesto * (1 - QUOTA_STRUMENTI)),
        richiedeConferma: (chiamata) => {
            if (!conf.confermaScritture || !scrive(chiamata.nome)) return false;
            const strumento = toolRegistry.getTool(chiamata.nome);
            return Boolean(strumento) && rbacGuard.validateExecution(utente, strumento.metadata || null, chiamata.nome).allowed;
        },
        verifica: creaVerifica({ famiglia: famigliaDi(testo), strumentoScrive: scrive })
    };

    const messaggi = [
        { ruolo: 'sistema', testo: [sistema, istruzioniOperative(), ricordiProtetti, impara ? pianoAppreso(suggeriti.piano) : ''].filter(Boolean).join('\n\n') },
        { ruolo: 'utente', testo }
    ];

    return Object.freeze({
        avvia: () => cicloAgente.esegui({ ...parametri, messaggi }),
        riprendi: (stato, approvata) => cicloAgente.esegui({ ...parametri, ripresa: { stato, approvata } }),
        descrivi: chiamata => descriviChiamata(chiamata, perNome.get(chiamata.nome)),
        strumentoNoto: nome => perNome.has(nome),
        offerti: () => insieme.elenco().length
    });
}

module.exports = { creaSessione, istruzioniOperative };
