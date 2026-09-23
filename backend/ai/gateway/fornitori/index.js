'use strict';

const ollama = require('./ollama');
const gemini = require('./gemini');

const FABBRICHE = Object.freeze({ ollama, gemini });

function crea(nome, opzioni) {
    const fabbrica = FABBRICHE[nome];
    if (!fabbrica) throw new Error(`Fornitore AI sconosciuto: ${nome}`);
    return fabbrica.crea(opzioni);
}

module.exports = { crea, disponibili: () => Object.keys(FABBRICHE) };
