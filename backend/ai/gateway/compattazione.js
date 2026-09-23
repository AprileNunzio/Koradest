'use strict';

const NOTA = Object.freeze({ compattato: true, nota: 'Risultato già letto in un passo precedente e ridotto per restare nel contesto: richiama lo strumento se ti serve di nuovo' });

const dimensione = messaggi => JSON.stringify(messaggi).length;

function compatta(conversazione, budgetCaratteri) {
    if (!Number.isFinite(budgetCaratteri) || dimensione(conversazione) <= budgetCaratteri) return conversazione;
    const risultato = [...conversazione];
    for (let indice = 0; indice < risultato.length && dimensione(risultato) > budgetCaratteri; indice += 1) {
        const messaggio = risultato[indice];
        if (messaggio.ruolo !== 'strumento' || messaggio.risultato.dati === NOTA) continue;
        risultato[indice] = { ...messaggio, risultato: { ...messaggio.risultato, dati: NOTA } };
    }
    return risultato;
}

module.exports = { compatta };
