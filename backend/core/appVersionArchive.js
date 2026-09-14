'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const CONSERVATE = 5;

function cartella(appId) {
    const base = path.join(app.getPath('userData'), 'app_versions', String(appId || 'sconosciuta'));
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    return base;
}

function nomeFile(appId, versione) {
    const pulita = String(versione || '0.0.0').replace(/[^0-9A-Za-z._-]/g, '_');
    return `${appId}_v${pulita}.zip`;
}

function impronta(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function conserva(db, appId, versione, buffer) {
    if (!buffer || buffer.length === 0) return null;

    const destinazione = path.join(cartella(appId), nomeFile(appId, versione));
    fs.writeFileSync(destinazione, buffer);

    const sha = impronta(buffer);
    if (db) {
        db.run(
            'INSERT OR REPLACE INTO app_versioni (app_id, version, file_path, sha256, dimensione, scaricato_il) VALUES (?, ?, ?, ?, ?, ?)',
            [appId, String(versione || ''), destinazione, sha, buffer.length, Math.floor(Date.now() / 1000)]
        );
    }

    pota(db, appId);
    return { file_path: destinazione, sha256: sha, dimensione: buffer.length };
}

function elenca(db, appId) {
    if (!db) return [];
    try {
        const righe = db.query(
            'SELECT * FROM app_versioni WHERE app_id = ? ORDER BY scaricato_il DESC, id DESC',
            [appId]
        ) || [];
        return righe.filter(riga => {
            try {
                return fs.existsSync(riga.file_path);
            } catch (errore) {
                return false;
            }
        });
    } catch (errore) {
        return [];
    }
}

function pota(db, appId) {
    const righe = elenca(db, appId);
    const eccedenti = righe.slice(CONSERVATE);
    for (const riga of eccedenti) {
        try {
            if (fs.existsSync(riga.file_path)) fs.rmSync(riga.file_path, { force: true });
        } catch (errore) {
            continue;
        }
        if (db) db.run('DELETE FROM app_versioni WHERE id = ?', [riga.id]);
    }
    return eccedenti.length;
}

function trova(db, appId, versione) {
    const righe = elenca(db, appId);
    return righe.find(riga => String(riga.version) === String(versione)) || null;
}

function leggi(db, appId, versione) {
    const riga = trova(db, appId, versione);
    if (!riga) return null;
    try {
        const buffer = fs.readFileSync(riga.file_path);
        if (riga.sha256 && impronta(buffer) !== riga.sha256) return null;
        return { buffer, riga };
    } catch (errore) {
        return null;
    }
}

function rimuoviTutte(db, appId) {
    const righe = elenca(db, appId);
    for (const riga of righe) {
        try {
            if (fs.existsSync(riga.file_path)) fs.rmSync(riga.file_path, { force: true });
        } catch (errore) {
            continue;
        }
    }
    try {
        const base = path.join(app.getPath('userData'), 'app_versions', String(appId));
        if (fs.existsSync(base)) fs.rmSync(base, { recursive: true, force: true });
    } catch (errore) {
        return righe.length;
    }
    return righe.length;
}

module.exports = { CONSERVATE, conserva, elenca, pota, trova, leggi, rimuoviTutte, cartella };
