'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const deposito = new AsyncLocalStorage();

function esegui(contesto, funzione) {
    return deposito.run(Object.freeze({ ...contesto }), funzione);
}

function corrente() {
    return deposito.getStore() || null;
}

function operatore() {
    const contesto = corrente();
    return contesto && contesto.operatoreId ? String(contesto.operatoreId) : null;
}

module.exports = { esegui, corrente, operatore };
