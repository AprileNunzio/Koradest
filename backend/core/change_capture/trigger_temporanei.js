'use strict';

const crypto = require('crypto');
const { quotaIdentificatore, quotaLetterale } = require('./identificatori');

const PREFISSO = '_k_cc_';
const EVENTI = ['INSERT', 'UPDATE', 'DELETE'];

function nomeTrigger(tabella, evento) {
    const impronta = crypto.createHash('sha256').update(tabella).digest('hex').slice(0, 20);
    return `${PREFISSO}${impronta}_${evento.toLowerCase()}`;
}

function jsonRiga(alias, colonne) {
    const parti = colonne.map((colonna) => {
        const riferimento = `${alias}.${quotaIdentificatore(colonna)}`;
        const valore = `json_quote(CASE WHEN typeof(${riferimento}) = 'blob' THEN 'blob:' || hex(${riferimento}) ELSE ${riferimento} END)`;
        return `${quotaLetterale(JSON.stringify(colonna))} || ':' || ${valore}`;
    });
    return `'{' || ${parti.join(" || ',' || ")} || '}'`;
}

function sqlTrigger(tabella, colonne, evento) {
    const prima = evento === 'INSERT' ? 'NULL' : jsonRiga('OLD', colonne);
    const dopo = evento === 'DELETE' ? 'NULL' : jsonRiga('NEW', colonne);
    const chiave = evento === 'DELETE' ? 'OLD.id' : 'NEW.id';
    return [
        `CREATE TEMP TRIGGER ${quotaIdentificatore(nomeTrigger(tabella, evento))}`,
        `AFTER ${evento} ON ${quotaIdentificatore(tabella)}`,
        'WHEN EXISTS (SELECT 1 FROM _k_sessione)',
        'BEGIN',
        'INSERT INTO _k_cambi (tabella, record_id, azione, prima, dopo)',
        `VALUES (${quotaLetterale(tabella)}, CAST(${chiave} AS TEXT), '${evento}', ${prima}, ${dopo});`,
        'END'
    ].join(' ');
}

function rimuoviTutti(archivio) {
    archivio.query("SELECT name FROM temp.sqlite_master WHERE type = 'trigger' AND substr(name, 1, 6) = ?", [PREFISSO])
        .forEach(riga => archivio.run(`DROP TRIGGER IF EXISTS temp.${quotaIdentificatore(riga.name)}`, []));
}

function installa(archivio, tabelle) {
    rimuoviTutti(archivio);
    tabelle.forEach(({ nome, colonne }) => {
        EVENTI.forEach(evento => archivio.run(sqlTrigger(nome, colonne, evento), []));
    });
}

module.exports = { installa, rimuoviTutti, sqlTrigger, nomeTrigger };
