'use strict';

function nomeLeggibile(utente) {
    const completo = `${utente.cognome || ''} ${utente.nome || ''}`.trim();
    return completo || utente.username || utente.id;
}

function archivioUtenti() {
    try {
        return require('../../db').getDB('auth');
    } catch (errore) {
        console.warn('[Audit] Archivio utenti non disponibile, lo storico mostra gli identificativi:', errore.message);
        return null;
    }
}

function risolvi(identificativi, leggiArchivioUtenti = archivioUtenti) {
    const unici = Array.from(new Set(identificativi.filter(Boolean)));
    if (unici.length === 0) return {};
    const archivio = leggiArchivioUtenti();
    if (!archivio) return {};
    const segnaposto = unici.map(() => '?').join(',');
    return Object.fromEntries(
        archivio.query(`SELECT id, nome, cognome, username FROM users WHERE id IN (${segnaposto})`, unici)
            .map(utente => [String(utente.id), nomeLeggibile(utente)])
    );
}

module.exports = { risolvi };
