'use strict';

const { quotaIdentificatore, nomeInterno } = require('./identificatori');

function versioneSchema(archivio) {
    return Number(archivio.query('PRAGMA main.schema_version')[0].schema_version);
}

function colonneDi(archivio, tabella) {
    return archivio.query(`PRAGMA main.table_info(${quotaIdentificatore(tabella)})`).map(colonna => colonna.name);
}

function tabelleTracciabili(archivio) {
    return archivio.query("SELECT name FROM main.sqlite_master WHERE type = 'table'")
        .map(riga => riga.name)
        .filter(nome => !nome.startsWith('sqlite_') && !nomeInterno(nome))
        .map(nome => ({ nome, colonne: colonneDi(archivio, nome) }))
        .filter(tabella => tabella.colonne.includes('id'));
}

module.exports = { versioneSchema, colonneDi, tabelleTracciabili };
