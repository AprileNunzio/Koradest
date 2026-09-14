'use strict';

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const ATTESA_INFO_MS = 4000;
const ATTESA_CONNESSIONE_MS = 8000;
const STALLO_MS = 20000;

const ESITO = {
    OK: 'ok',
    STALLO: 'stallo',
    ERRORE: 'errore',
    CORROTTO: 'corrotto',
    ASSENTE: 'assente'
};

function _parziale(destinazione) {
    return `${destinazione}.part`;
}

function _dimensione(percorso) {
    try {
        return fs.existsSync(percorso) ? fs.statSync(percorso).size : 0;
    } catch (e) {
        return 0;
    }
}

function _elimina(percorso) {
    try {
        if (fs.existsSync(percorso)) fs.unlinkSync(percorso);
    } catch (e) {}
}

function infoDaPari(ip, porta) {
    return new Promise(risolvi => {
        try {
            const req = http.get(`http://${ip}:${porta}/sync/update-info`, { timeout: ATTESA_INFO_MS }, res => {
                if (res.statusCode !== 200) {
                    res.resume();
                    return risolvi(null);
                }
                let corpo = '';
                res.on('data', c => { corpo += c; });
                res.on('end', () => {
                    try { risolvi(JSON.parse(corpo)); } catch (_) { risolvi(null); }
                });
            });
            req.on('error', () => risolvi(null));
            req.on('timeout', () => { try { req.destroy(); } catch (_) {} risolvi(null); });
        } catch (e) {
            risolvi(null);
        }
    });
}

function impronta(percorso) {
    return new Promise(risolvi => {
        try {
            const hash = crypto.createHash('sha512');
            const lettura = fs.createReadStream(percorso);
            lettura.on('data', pezzo => hash.update(pezzo));
            lettura.on('end', () => risolvi(hash.digest('base64')));
            lettura.on('error', () => risolvi(null));
        } catch (e) {
            risolvi(null);
        }
    });
}

async function verificaFile(percorso, attesa) {
    try {
        if (!fs.existsSync(percorso)) return false;
        if (!attesa) return true;
        const calcolata = await impronta(percorso);
        return Boolean(calcolata) && calcolata === attesa;
    } catch (e) {
        return false;
    }
}

function _scaricaPezzo({ ip, porta, versione, destinazione, onProgress }) {
    return new Promise(risolvi => {
        const parziale = _parziale(destinazione);
        let giaScaricati = _dimensione(parziale);
        let orologio = null;
        let chiuso = false;

        const termina = (esito, dettaglio) => {
            if (chiuso) return;
            chiuso = true;
            if (orologio) clearTimeout(orologio);
            risolvi({ esito, dettaglio: dettaglio || '' });
        };

        try {
            const intestazioni = giaScaricati > 0 ? { Range: `bytes=${giaScaricati}-` } : {};
            const req = http.get(
                `http://${ip}:${porta}/sync/update/download/${versione}`,
                { timeout: ATTESA_CONNESSIONE_MS, headers: intestazioni },
                res => {
                    if (res.statusCode === 404) {
                        res.resume();
                        return termina(ESITO.ASSENTE, 'il nodo non ha piu il pacchetto');
                    }
                    if (res.statusCode !== 200 && res.statusCode !== 206) {
                        res.resume();
                        return termina(ESITO.ERRORE, `risposta HTTP ${res.statusCode}`);
                    }

                    if (giaScaricati > 0 && res.statusCode === 200) {
                        _elimina(parziale);
                        giaScaricati = 0;
                    }

                    const lunghezzaPezzo = parseInt(res.headers['content-length'] || '0', 10);
                    const totale = giaScaricati + lunghezzaPezzo;
                    let ricevuti = giaScaricati;

                    const scrittura = fs.createWriteStream(parziale, { flags: giaScaricati > 0 ? 'a' : 'w' });

                    const riarmaOrologio = () => {
                        if (orologio) clearTimeout(orologio);
                        orologio = setTimeout(() => {
                            try { req.destroy(); } catch (_) {}
                            try { scrittura.destroy(); } catch (_) {}
                            termina(ESITO.STALLO, `nessun dato per ${Math.round(STALLO_MS / 1000)} secondi`);
                        }, STALLO_MS);
                    };

                    res.on('data', pezzo => {
                        ricevuti += pezzo.length;
                        riarmaOrologio();
                        if (totale > 0 && typeof onProgress === 'function') {
                            onProgress({ ricevuti, totale, percentuale: (ricevuti / totale) * 100 });
                        }
                    });

                    res.on('error', errore => {
                        try { scrittura.destroy(); } catch (_) {}
                        termina(ESITO.ERRORE, errore.message);
                    });

                    scrittura.on('error', errore => termina(ESITO.ERRORE, errore.message));
                    scrittura.on('close', () => {
                        if (chiuso) return;
                        if (lunghezzaPezzo > 0 && ricevuti < totale) {
                            return termina(ESITO.STALLO, 'trasferimento interrotto prima della fine');
                        }
                        termina(ESITO.OK, '');
                    });

                    riarmaOrologio();
                    res.pipe(scrittura);
                }
            );

            req.on('error', errore => termina(ESITO.ERRORE, errore.message));
            req.on('timeout', () => {
                try { req.destroy(); } catch (_) {}
                termina(ESITO.ERRORE, 'nessuna risposta dal nodo');
            });
        } catch (errore) {
            termina(ESITO.ERRORE, errore.message);
        }
    });
}

async function scaricaDaPari({ ip, porta, versione, destinazione, atteso, onProgress, onLog }) {
    const registra = messaggio => {
        try { if (typeof onLog === 'function') onLog(messaggio); } catch (_) {}
    };

    const esito = await _scaricaPezzo({ ip, porta, versione, destinazione, onProgress });
    if (esito.esito !== ESITO.OK) {
        registra(`[Update LAN] ${ip}: ${esito.esito} (${esito.dettaglio}). Il progresso parziale viene conservato.`);
        return esito;
    }

    const parziale = _parziale(destinazione);
    const valido = await verificaFile(parziale, atteso);
    if (!valido) {
        registra(`[Update LAN] ${ip}: impronta del pacchetto non corrispondente, scarto il file e riparto.`);
        _elimina(parziale);
        return { esito: ESITO.CORROTTO, dettaglio: 'impronta non corrispondente' };
    }

    try {
        _elimina(destinazione);
        fs.renameSync(parziale, destinazione);
    } catch (errore) {
        return { esito: ESITO.ERRORE, dettaglio: `impossibile salvare il pacchetto: ${errore.message}` };
    }

    registra(`[Update LAN] ${ip}: pacchetto v${versione} completato e verificato.`);
    return { esito: ESITO.OK, dettaglio: '' };
}

async function scaricaDallaRete({ versione, candidati, destinazione, atteso, onProgress, onLog, onTentativo }) {
    const registra = messaggio => {
        try { if (typeof onLog === 'function') onLog(messaggio); } catch (_) {}
    };

    if (await verificaFile(destinazione, atteso)) {
        registra(`[Update LAN] pacchetto v${versione} gia presente e valido.`);
        return { riuscito: true, fonte: 'locale' };
    }

    const provati = [];
    for (const candidato of candidati || []) {
        const ip = candidato && candidato.ip;
        if (!ip) continue;
        const porta = candidato.port || candidato.porta || 34567;
        const chiave = `${ip}:${porta}`;
        if (provati.indexOf(chiave) !== -1) continue;
        provati.push(chiave);

        try { if (typeof onTentativo === 'function') onTentativo(candidato); } catch (_) {}

        const esito = await scaricaDaPari({
            ip,
            porta,
            versione,
            destinazione,
            atteso,
            onProgress,
            onLog
        });

        if (esito.esito === ESITO.OK) {
            return { riuscito: true, fonte: ip };
        }
    }

    return {
        riuscito: false,
        fonte: null,
        motivo: provati.length === 0
            ? 'nessun nodo dello studio ha il pacchetto'
            : `nessuno dei nodi contattati ha completato il trasferimento (${provati.join(', ')})`
    };
}

module.exports = {
    ESITO,
    STALLO_MS,
    infoDaPari,
    impronta,
    verificaFile,
    scaricaDaPari,
    scaricaDallaRete
};
