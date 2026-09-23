'use strict';

const preparati = new WeakSet();

const ISTRUZIONI = [
    'CREATE TABLE IF NOT EXISTS _k_audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, tabella TEXT NOT NULL, record_id TEXT NOT NULL, campo TEXT NOT NULL, azione TEXT NOT NULL, prima TEXT, dopo TEXT, operatore_id TEXT, data_ora TEXT NOT NULL, impronta_precedente TEXT NOT NULL, impronta TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS _k_audit_campo ON _k_audit (tabella, record_id, campo, seq)',
    "CREATE TRIGGER IF NOT EXISTS _k_audit_immutabile_upd BEFORE UPDATE ON _k_audit BEGIN SELECT RAISE(ABORT, 'Il registro di audit non si modifica'); END",
    "CREATE TRIGGER IF NOT EXISTS _k_audit_immutabile_del BEFORE DELETE ON _k_audit BEGIN SELECT RAISE(ABORT, 'Il registro di audit non si cancella'); END"
];

function prepara(archivio) {
    if (preparati.has(archivio)) return;
    ISTRUZIONI.forEach(istruzione => archivio.run(istruzione, []));
    preparati.add(archivio);
}

module.exports = { prepara };
