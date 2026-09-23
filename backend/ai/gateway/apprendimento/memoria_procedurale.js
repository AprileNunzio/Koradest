'use strict';

const MASSIMO_ESPERIENZE = 400;
const MASSIMO_RADICI = 24;
const SOMIGLIANZA_UNIONE = 0.6;
const SOMIGLIANZA_SUGGERIMENTO = 0.34;
const SOMIGLIANZA_PIANO = 0.5;
const MASSIMO_PASSI_PIANO = 6;

function jaccard(a, b) {
    const primo = new Set(a);
    const secondo = new Set(b);
    const comuni = [...primo].filter(voce => secondo.has(voce)).length;
    const unione = new Set([...primo, ...secondo]).size;
    return unione === 0 ? 0 : comuni / unione;
}

const affidabilita = esperienza => (esperienza.successi + 1) / (esperienza.successi + esperienza.fallimenti + 2);
const stessaSequenza = (a, b) => a.length === b.length && a.every((nome, indice) => nome === b[indice]);
const valore = esperienza => affidabilita(esperienza) * Math.log2(2 + esperienza.successi) - (Date.now() - esperienza.ultimo) / (1000 * 60 * 60 * 24 * 365);

function trova(esperienze, radici, sequenza) {
    return esperienze.find(esperienza => stessaSequenza(esperienza.sequenza, sequenza) && jaccard(esperienza.radici, radici) >= SOMIGLIANZA_UNIONE);
}

function impara(dati, { radici, sequenza, riuscito }) {
    if (!radici.length || !sequenza.length) return dati;
    const esistente = trova(dati.esperienze, radici, sequenza);
    if (esistente) {
        esistente.radici = [...new Set([...esistente.radici, ...radici])].slice(0, MASSIMO_RADICI);
        esistente[riuscito ? 'successi' : 'fallimenti'] += 1;
        esistente.ultimo = Date.now();
        return dati;
    }
    dati.esperienze.push({ radici: radici.slice(0, MASSIMO_RADICI), sequenza: sequenza.slice(0, MASSIMO_PASSI_PIANO), successi: riuscito ? 1 : 0, fallimenti: riuscito ? 0 : 1, ultimo: Date.now() });
    if (dati.esperienze.length > MASSIMO_ESPERIENZE) {
        dati.esperienze.sort((a, b) => valore(b) - valore(a));
        dati.esperienze.length = MASSIMO_ESPERIENZE;
    }
    return dati;
}

function penalizza(dati, { radici, sequenza }, peso = 2) {
    const esistente = trova(dati.esperienze, radici, sequenza);
    if (esistente) esistente.fallimenti += peso;
    return dati;
}

function suggerisci(dati, radici) {
    const pesi = new Map();
    let piano = null;
    dati.esperienze
        .map(esperienza => ({ esperienza, somiglianza: jaccard(esperienza.radici, radici) }))
        .filter(voce => voce.somiglianza >= SOMIGLIANZA_SUGGERIMENTO && voce.esperienza.successi > voce.esperienza.fallimenti)
        .sort((a, b) => b.somiglianza * affidabilita(b.esperienza) - a.somiglianza * affidabilita(a.esperienza))
        .forEach(({ esperienza, somiglianza }) => {
            const peso = somiglianza * affidabilita(esperienza);
            esperienza.sequenza.forEach(nome => pesi.set(nome, Math.max(pesi.get(nome) || 0, peso)));
            if (!piano && somiglianza >= SOMIGLIANZA_PIANO) piano = { sequenza: esperienza.sequenza, successi: esperienza.successi };
        });
    return { pesi, piano };
}

module.exports = { impara, penalizza, suggerisci, jaccard, MASSIMO_ESPERIENZE };
