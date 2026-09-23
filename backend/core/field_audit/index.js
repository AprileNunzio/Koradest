'use strict';

const registro = require('./registro_audit');
const azioniDiSistema = require('./azioni_di_sistema');

module.exports = {
    registra: registro.registra,
    storico: registro.storico,
    verifica: registro.verifica,
    prepara: registro.prepara,
    azioniDiSistema: azioniDiSistema.crea,
    nomeRiservato: azioniDiSistema.nomeRiservato
};
