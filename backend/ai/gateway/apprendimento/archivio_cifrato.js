'use strict';

const fs = require('fs');
const path = require('path');

const VUOTO = () => ({ versione: 1, esperienze: [], lezioni: {}, utenti: {}, statistiche: { richieste: 0, riuscite: 0, correzioni: 0, conferme: 0, rifiuti: 0, votiPositivi: 0, votiNegativi: 0 } });

function creaArchivioCifrato({ cifratore, percorso, avvisa = messaggio => console.warn(messaggio) }) {
    let cache = null;
    const disponibile = () => Boolean(cifratore && cifratore.isEncryptionAvailable());

    const carica = () => {
        if (!disponibile() || !fs.existsSync(percorso)) return VUOTO();
        const dati = JSON.parse(cifratore.decryptString(fs.readFileSync(percorso)));
        return { ...VUOTO(), ...dati, statistiche: { ...VUOTO().statistiche, ...(dati.statistiche || {}) } };
    };

    return Object.freeze({
        persistente: disponibile,
        leggi() {
            if (!cache) cache = carica();
            return cache;
        },
        scrivi(dati) {
            cache = dati;
            if (!disponibile()) {
                avvisa('[AI] Cifratura del sistema non disponibile: l\'apprendimento resta solo in memoria fino alla chiusura');
                return;
            }
            fs.mkdirSync(path.dirname(percorso), { recursive: true });
            const temporaneo = `${percorso}.tmp`;
            fs.writeFileSync(temporaneo, cifratore.encryptString(JSON.stringify(dati)), { mode: 0o600 });
            fs.renameSync(temporaneo, percorso);
        },
        azzera() {
            cache = VUOTO();
            if (fs.existsSync(percorso)) fs.rmSync(percorso);
            return cache;
        }
    });
}

module.exports = { creaArchivioCifrato, VUOTO };
