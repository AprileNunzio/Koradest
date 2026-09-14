'use strict';

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const AdmZip = require('adm-zip');
const cryptoVerifier = require('../security/cryptoVerifier');

const TIMEOUT_PEER_MS = 15000;

const NO_CACHE = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
};

function _baseStaging() {
    try {
        const base = path.join(app.getPath('userData'), 'temp_staging');
        if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
        return base;
    } catch (e) {
        throw e;
    }
}

function _nuovaCartellaStaging(appId) {
    try {
        const dir = path.join(_baseStaging(), `${appId}_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    } catch (e) {
        throw e;
    }
}

function _rimuovi(dir) {
    try {
        if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
}

function _estrai(zipBuffer, destinazione) {
    try {
        const zip = new AdmZip(zipBuffer);
        for (const entry of zip.getEntries()) {
            const bersaglio = path.join(destinazione, entry.entryName);
            const relativo = path.relative(destinazione, bersaglio);
            if (relativo.startsWith('..') || path.isAbsolute(relativo)) {
                throw new Error(`Tentativo di Zip Slip rilevato: ${entry.entryName}`);
            }
        }
        zip.extractAllTo(destinazione, true);
        return true;
    } catch (e) {
        throw e;
    }
}

function _leggiManifestEstratto(stagingDir) {
    try {
        const percorso = path.join(stagingDir, 'manifest.json');
        if (!fs.existsSync(percorso)) return null;
        return JSON.parse(fs.readFileSync(percorso, 'utf8'));
    } catch (e) {
        return null;
    }
}

function verificaContenuto(stagingDir, appId, versioneAttesa) {
    try {
        const manifest = _leggiManifestEstratto(stagingDir);
        if (!manifest) return { valido: false, motivo: 'manifest.json mancante nel pacchetto' };
        const identificativi = [manifest.id, manifest.folder].filter(Boolean);
        if (identificativi.length > 0 && !identificativi.includes(appId)) {
            return { valido: false, motivo: `il pacchetto contiene "${manifest.id || manifest.folder}" invece di "${appId}"` };
        }
        if (versioneAttesa && manifest.version && String(manifest.version) !== String(versioneAttesa)) {
            return { valido: false, motivo: `versione ${manifest.version} invece della ${versioneAttesa} richiesta` };
        }
        const { valida } = require('./manifest/manifest_v2');
        let versioneCore = null;
        try {
            versioneCore = require('electron').app.getVersion();
        } catch (e) {
            versioneCore = null;
        }
        const verifica = valida(manifest, { cartella: stagingDir, versioneCore });
        if (!verifica.valido) {
            return { valido: false, motivo: `manifest non conforme al formato KORADEST v2: ${verifica.errori.join('; ')}` };
        }
        return { valido: true, manifest };
    } catch (e) {
        return { valido: false, motivo: e.message };
    }
}

async function _hashDiRete() {
    try {
        const { getNetworkCodeHash } = require('../db');
        return await getNetworkCodeHash();
    } catch (e) {
        return null;
    }
}

function _peerCandidati() {
    try {
        const sync = require('../sync');
        const nodi = typeof sync.getDetailedNodes === 'function' ? sync.getDetailedNodes() : [];
        return (nodi || []).filter(n => n && n.ip && n.ip !== '127.0.0.1' && n.status !== 'Offline');
    } catch (e) {
        return [];
    }
}

async function _scaricaDaPeer(peer, appId, versioneRichiesta, hashRete) {
    try {
        const porta = peer.port || 34567;
        const query = versioneRichiesta ? `?version=${encodeURIComponent(versioneRichiesta)}` : '';
        const url = `http://${peer.ip}:${porta}/sync/app-package/${encodeURIComponent(appId)}${query}`;
        const controller = new AbortController();
        const scadenza = setTimeout(() => controller.abort(), TIMEOUT_PEER_MS);
        try {
            const risposta = await fetch(url, {
                signal: controller.signal,
                headers: { 'x-koradest-network': hashRete }
            });
            if (!risposta.ok) return null;
            const versionePeer = risposta.headers.get('x-koradest-app-version');
            if (versioneRichiesta && versionePeer && versionePeer !== String(versioneRichiesta)) return null;
            const buffer = Buffer.from(await risposta.arrayBuffer());
            return buffer.length > 0 ? buffer : null;
        } finally {
            clearTimeout(scadenza);
        }
    } catch (e) {
        return null;
    }
}

async function _daRete(appId, versioneRichiesta) {
    try {
        const peers = _peerCandidati();
        if (peers.length === 0) return null;
        const hashRete = await _hashDiRete();
        if (!hashRete) return null;
        for (const peer of peers) {
            const buffer = await _scaricaDaPeer(peer, appId, versioneRichiesta, hashRete);
            if (buffer) return { buffer, peer };
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function _daRepository(manifestBersaglio) {
    try {
        if (!manifestBersaglio || !manifestBersaglio.downloadUrl) {
            throw new Error('Download URL non disponibile');
        }
        const bust = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const risposta = await fetch(`${manifestBersaglio.downloadUrl}?t=${bust}`, { headers: NO_CACHE });
        if (!risposta.ok) throw new Error(`Download HTTP fallito: ${risposta.status} ${risposta.statusText}`);
        const buffer = Buffer.from(await risposta.arrayBuffer());
        if (manifestBersaglio.signature) {
            if (!cryptoVerifier.verifyBufferSignature(buffer, manifestBersaglio.signature)) {
                throw new Error('Firma crittografica del pacchetto non valida: download bloccato');
            }
        }
        if (manifestBersaglio.sha256) {
            const calcolato = cryptoVerifier.computeBufferHash(buffer);
            if (calcolato && calcolato.toLowerCase() !== String(manifestBersaglio.sha256).toLowerCase()) {
                throw new Error('Impronta SHA-256 del pacchetto non corrispondente: download bloccato');
            }
        }
        return buffer;
    } catch (e) {
        throw e;
    }
}

async function acquisisci(appId, manifestBersaglio) {
    const versione = manifestBersaglio ? manifestBersaglio.version : null;
    let stagingDir = null;
    try {
        const daPeer = await _daRete(appId, versione);
        if (daPeer) {
            stagingDir = _nuovaCartellaStaging(appId);
            try {
                _estrai(daPeer.buffer, stagingDir);
                const esito = verificaContenuto(stagingDir, appId, versione);
                if (esito.valido) {
                    return { stagingDir, downloadedFromPeer: true, peerIp: daPeer.peer.ip, buffer: daPeer.buffer };
                }
                console.warn(`[Store] Pacchetto rifiutato dal nodo ${daPeer.peer.ip}: ${esito.motivo}`);
            } catch (errorePeer) {
                console.warn(`[Store] Pacchetto illeggibile dal nodo ${daPeer.peer.ip}: ${errorePeer.message}`);
            }
            _rimuovi(stagingDir);
            stagingDir = null;
        }

        const buffer = await _daRepository(manifestBersaglio);
        stagingDir = _nuovaCartellaStaging(appId);
        _estrai(buffer, stagingDir);
        const esito = verificaContenuto(stagingDir, appId, versione);
        if (!esito.valido) {
            throw new Error(`Pacchetto applicativo non integro: ${esito.motivo}`);
        }
        return { stagingDir, downloadedFromPeer: false, peerIp: null, buffer };
    } catch (e) {
        _rimuovi(stagingDir);
        throw e;
    }
}

async function daBuffer(appId, buffer, versioneAttesa) {
    let stagingDir = null;
    try {
        stagingDir = _nuovaCartellaStaging(appId);
        _estrai(buffer, stagingDir);
        const esito = verificaContenuto(stagingDir, appId, versioneAttesa);
        if (!esito.valido) throw new Error(`Pacchetto applicativo non integro: ${esito.motivo}`);
        return { stagingDir, downloadedFromPeer: false, peerIp: null, buffer };
    } catch (e) {
        _rimuovi(stagingDir);
        throw e;
    }
}

function pulisciStagingResidui() {
    try {
        const base = _baseStaging();
        for (const voce of fs.readdirSync(base)) {
            _rimuovi(path.join(base, voce));
        }
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = { acquisisci, daBuffer, verificaContenuto, pulisciStagingResidui };
