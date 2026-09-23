'use strict';

const path = require('path');
const { creaModelloVoce, MODELLO } = require('./modello_voce');

let istanza = null;

function modelloVoce() {
    if (istanza) return istanza;
    const { app } = require('electron');
    istanza = creaModelloVoce({ cartella: path.join(app.getPath('userData'), 'ai', 'voce') });
    return istanza;
}

module.exports = { modelloVoce, MODELLO };
