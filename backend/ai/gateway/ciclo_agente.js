'use strict';

const { compatta } = require('./compattazione');

const ANNULLATA = Object.freeze({ errore: 'L\'utente non ha confermato questa operazione: non ripeterla e chiedi come vuole procedere', stato: 'ANNULLATO' });

function statoIniziale(messaggi) {
    return { conversazione: [...messaggi], eseguiti: [], passo: 0, coda: [], correzioni: 0 };
}

async function esegui({
    fornitore,
    modello,
    messaggi = [],
    strumenti,
    eseguiStrumento,
    passiMassimi,
    budgetConversazione = Infinity,
    richiedeConferma = () => false,
    verifica = () => null,
    ripresa = null
}) {
    const strumentiDelPasso = typeof strumenti === 'function' ? strumenti : () => strumenti;
    const stato = ripresa ? { ...ripresa.stato, coda: [...ripresa.stato.coda] } : statoIniziale(messaggi);

    const registra = (chiamata, dati) => {
        stato.eseguiti.push({ nome: chiamata.nome, esito: dati.errore ? 'errore' : 'ok', argomenti: chiamata.argomenti || {}, errore: dati.errore || null, stato: dati.stato || null });
        stato.conversazione.push({ ruolo: 'strumento', risultato: { id: chiamata.id, nome: chiamata.nome, dati } });
    };

    if (ripresa) {
        const chiamata = stato.coda.shift();
        registra(chiamata, ripresa.approvata ? await eseguiStrumento(chiamata, { confermata: true }) : ANNULLATA);
    }

    for (;;) {
        while (stato.coda.length) {
            const chiamata = stato.coda[0];
            if (richiedeConferma(chiamata)) return { sospeso: true, chiamata, stato, eseguiti: stato.eseguiti, passi: stato.passo };
            stato.coda.shift();
            registra(chiamata, await eseguiStrumento(chiamata));
        }
        if (stato.passo >= passiMassimi) {
            return {
                testo: `Ho eseguito ${stato.eseguiti.length} operazioni senza arrivare a una risposta finale entro ${passiMassimi} passi. Riformula la richiesta in modo più specifico.`,
                passi: stato.passo,
                eseguiti: stato.eseguiti,
                limiteRaggiunto: true,
                corretto: stato.correzioni > 0
            };
        }
        stato.passo += 1;
        stato.conversazione = compatta(stato.conversazione, budgetConversazione);
        const risposta = await fornitore.chat({ messaggi: stato.conversazione, strumenti: strumentiDelPasso(), modello });
        if (risposta.chiamate.length === 0) {
            const correzione = stato.correzioni === 0 ? verifica(risposta.testo, stato.eseguiti) : null;
            if (!correzione) return { testo: risposta.testo, passi: stato.passo, eseguiti: stato.eseguiti, limiteRaggiunto: false, corretto: stato.correzioni > 0 };
            stato.correzioni += 1;
            stato.conversazione.push({ ruolo: 'assistente', testo: risposta.testo }, { ruolo: 'utente', testo: correzione });
            continue;
        }
        stato.conversazione.push({ ruolo: 'assistente', testo: risposta.testo, chiamate: risposta.chiamate });
        stato.coda.push(...risposta.chiamate);
    }
}

module.exports = { esegui, ANNULLATA };
