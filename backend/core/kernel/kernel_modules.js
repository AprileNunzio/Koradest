'use strict';

// Dependency pooling: le librerie npm vivono una sola volta nel core. Un'app che dichiara
//   "kernelModules": ["xlsx", "nodemailer"]
// puo richiederle con require() anche se non le include nel proprio pacchetto.
// Sono concesse solo le dipendenze dirette del core e solo alle app che le dichiarano.

const Module = require('module');
const path = require('path');

const RADICE_CORE = path.join(__dirname, '..', '..', '..');
// Librerie interne al core: gli archivi passano da AppDbManager, gli aggiornamenti dal core.
const RISERVATI_AL_CORE = new Set(['better-sqlite3', 'electron-updater', '@simplewebauthn/server']);
const _perCartella = new Map();
let _risolviOriginale = null;

function pacchettiDelCore() {
    try {
        const pacchetto = require(path.join(RADICE_CORE, 'package.json'));
        return Object.keys(pacchetto.dependencies || {})
            .filter(nome => !RISERVATI_AL_CORE.has(nome))
            .sort();
    } catch (errore) {
        console.error('[KernelModules] package.json del core illeggibile:', errore.message);
        return [];
    }
}

function nomePacchetto(richiesta) {
    const pezzi = String(richiesta).split('/');
    return richiesta.startsWith('@') ? pezzi.slice(0, 2).join('/') : pezzi[0];
}

function richiestaNuda(richiesta) {
    if (typeof richiesta !== 'string' || richiesta.length === 0) return false;
    if (richiesta.startsWith('.') || richiesta.startsWith('node:') || path.isAbsolute(richiesta)) return false;
    return !Module.builtinModules.includes(nomePacchetto(richiesta));
}

function chiaveCartella(cartella) {
    return path.resolve(cartella).toLowerCase() + path.sep;
}

function appDelFile(nomeFile) {
    if (!nomeFile) return null;
    const file = path.resolve(nomeFile).toLowerCase();
    for (const [cartella, voce] of _perCartella) {
        if (file.startsWith(cartella)) return voce;
    }
    return null;
}

function installa() {
    if (_risolviOriginale) return;
    _risolviOriginale = Module._resolveFilename;
    Module._resolveFilename = function risolviConKernel(richiesta, genitore, ...resto) {
        try {
            return _risolviOriginale.call(this, richiesta, genitore, ...resto);
        } catch (errore) {
            if (errore.code !== 'MODULE_NOT_FOUND' || !richiestaNuda(richiesta)) throw errore;
            const voce = appDelFile(genitore && genitore.filename);
            if (!voce || !voce.concessi.has(nomePacchetto(richiesta))) throw errore;
            return require.resolve(richiesta, { paths: [RADICE_CORE] });
        }
    };
}

function registra(manifest, cartellaApp) {
    installa();
    const disponibili = new Set(pacchettiDelCore());
    const dichiarati = Array.isArray(manifest && manifest.kernelModules) ? manifest.kernelModules : [];
    const concessi = dichiarati.filter(nome => typeof nome === 'string' && disponibili.has(nome));
    const rifiutati = dichiarati.filter(nome => !concessi.includes(nome));
    if (manifest && manifest.id && cartellaApp) {
        rimuovi(manifest.id);
        _perCartella.set(chiaveCartella(cartellaApp), { appId: manifest.id, concessi: new Set(concessi) });
    }
    return { concessi, rifiutati };
}

function rimuovi(appId) {
    for (const [cartella, voce] of _perCartella) {
        if (voce.appId === appId) _perCartella.delete(cartella);
    }
}

function concessiA(appId) {
    for (const voce of _perCartella.values()) {
        if (voce.appId === appId) return Array.from(voce.concessi).sort();
    }
    return [];
}

module.exports = { installa, registra, rimuovi, concessiA, pacchettiDelCore };
