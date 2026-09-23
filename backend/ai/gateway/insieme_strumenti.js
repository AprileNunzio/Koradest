'use strict';

const peso = strumento => JSON.stringify(strumento).length;

function creaInsieme({ iniziali, fissi, budgetCaratteri }) {
    let attivi = [...iniziali];
    const occupato = () => [...fissi, ...attivi].reduce((somma, strumento) => somma + peso(strumento), 0);

    return Object.freeze({
        elenco: () => [...fissi, ...attivi],
        aggiungi(nuovi) {
            const daAggiungere = nuovi.filter(strumento => !attivi.includes(strumento));
            attivi = [...attivi, ...daAggiungere];
            while (occupato() > budgetCaratteri && attivi.length > daAggiungere.length) attivi.shift();
            return daAggiungere.length;
        }
    });
}

module.exports = { creaInsieme };
