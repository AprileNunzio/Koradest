'use strict';

const NOME_SICURO = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const PREFISSO_INTERNO = '_k_';

function quotaIdentificatore(nome) {
    return `"${String(nome).replace(/"/g, '""')}"`;
}

function quotaLetterale(testo) {
    return `'${String(testo).replace(/'/g, "''")}'`;
}

function nomeValido(nome) {
    return typeof nome === 'string' && NOME_SICURO.test(nome);
}

function nomeInterno(nome) {
    return String(nome).toLowerCase().startsWith(PREFISSO_INTERNO);
}

module.exports = { quotaIdentificatore, quotaLetterale, nomeValido, nomeInterno, PREFISSO_INTERNO };
