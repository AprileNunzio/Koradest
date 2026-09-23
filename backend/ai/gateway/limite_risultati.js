'use strict';

const dimensione = valore => JSON.stringify(valore === undefined ? null : valore).length;

function limitaElenco(elenco, massimo) {
    const mostrati = [];
    let usati = 0;
    for (const elemento of elenco) {
        const peso = dimensione(elemento) + 1;
        if (usati + peso > massimo) break;
        mostrati.push(elemento);
        usati += peso;
    }
    return {
        elementi: mostrati,
        mostrati: mostrati.length,
        totale: elenco.length,
        nota: 'Elenco troncato per stare nel contesto del modello: restringi la richiesta con filtri se servono gli altri elementi'
    };
}

function limita(dati, massimoCaratteri) {
    if (dimensione(dati) <= massimoCaratteri) return dati;
    if (Array.isArray(dati)) return limitaElenco(dati, massimoCaratteri - 300);
    const testo = JSON.stringify(dati);
    return { anteprima: testo.slice(0, Math.max(0, massimoCaratteri - 200)), troncato: true, caratteriTotali: testo.length };
}

module.exports = { limita };
