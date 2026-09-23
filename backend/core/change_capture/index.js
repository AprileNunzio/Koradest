'use strict';

const cattura = require('./cattura');
const { inoltra } = require('./inoltro_replica');
const identificatori = require('./identificatori');

module.exports = {
    traccia: cattura.traccia,
    allinea: cattura.allinea,
    dimentica: cattura.dimentica,
    inoltra,
    nomeValido: identificatori.nomeValido,
    nomeInterno: identificatori.nomeInterno
};
