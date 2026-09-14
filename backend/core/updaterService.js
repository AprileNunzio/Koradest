'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const updatePolicy = require('./updatePolicy');
const lanUpdateFetcher = require('./lanUpdateFetcher');

let _isManualCheck = false;
let _isDownloading = false;
let _adoptingLan = false;
let _pendingVersion = null;
let _intervalloId = null;

function isUpdateInProgress() {
    return _isDownloading || _adoptingLan || _pendingVersion !== null;
}

function getPendingUpdateVersion() {
    return _pendingVersion;
}

function _broadcastToWindows(channel, payload) {
    try {
        const wins = BrowserWindow.getAllWindows();
        wins.forEach(w => {
            try {
                if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
            } catch (_) {}
        });
    } catch (_) {}
}

function installPendingUpdateNow() {
    try {
        const updatesManager = require('../updates_manager');
        const pendingVer = _pendingVersion || (typeof updatesManager.getHighestLocalVersion === 'function' ? updatesManager.getHighestLocalVersion() : null);

        if (pendingVer) {
            const localInstaller = updatesManager.getInstallerPath(pendingVer);
            if (localInstaller && fs.existsSync(localInstaller)) {
                return updatesManager.runInstaller(pendingVer);
            }
        }

        const { autoUpdater } = require('electron-updater');
        try {
            autoUpdater.quitAndInstall(false, true);
            return true;
        } catch (_) {
            if (pendingVer) {
                return updatesManager.runInstaller(pendingVer);
            }
            return false;
        }
    } catch (e) {
        return false;
    }
}

function forceUpdateConsensus() {
    try {
        if (!_pendingVersion) return;
        _broadcastToWindows('update-ready-for-install', { version: _pendingVersion });
    } catch (_) {}
}

function checkUpdateConsensus() {
    try {
        if (!_pendingVersion) return;
        _broadcastToWindows('update-ready-for-install', { version: _pendingVersion });
    } catch (_) {}
}

const BACKOFF_MS = [30000, 120000, 480000, 1800000];
const TENTATIVI_PRIMA_DEL_RIPIEGO = 2;

const _fallimenti = new Map();

function _statoFallimento(versione) {
    return _fallimenti.get(versione) || { conteggio: 0, prossimoTentativo: 0 };
}

function _registraFallimento(versione) {
    const stato = _statoFallimento(versione);
    stato.conteggio += 1;
    const attesa = BACKOFF_MS[Math.min(stato.conteggio - 1, BACKOFF_MS.length - 1)];
    stato.prossimoTentativo = Date.now() + attesa;
    _fallimenti.set(versione, stato);
    return stato;
}

function _azzeraFallimenti(versione) {
    _fallimenti.delete(versione);
}

function _candidatiPerVersione(versione, ipPreferito, portaPreferita) {
    const elenco = [];
    if (ipPreferito) elenco.push({ ip: ipPreferito, port: portaPreferita || 34567 });
    try {
        const { getDetailedNodes } = require('../sync');
        const nodi = typeof getDetailedNodes === 'function' ? getDetailedNodes() : [];
        for (const nodo of nodi || []) {
            if (!nodo || !nodo.ip || nodo.ip === '127.0.0.1') continue;
            if (nodo.status === 'Offline') continue;
            if (nodo.updateReadyVersion !== versione) continue;
            if (elenco.some(voce => voce.ip === nodo.ip)) continue;
            elenco.push({ ip: nodo.ip, port: nodo.port || 34567 });
        }
    } catch (_) {}
    return elenco;
}

function _ripiegaSuRepository(versione, motivo) {
    try {
        const { autoUpdater } = require('electron-updater');
        _broadcastToWindows('update-status', {
            status: `Rete locale non disponibile (${motivo}). Scarico v${versione} da Internet...`,
            finished: false
        });
        _isDownloading = true;
        autoUpdater.downloadUpdate().catch(() => {
            _isDownloading = false;
            _broadcastToWindows('update-status', {
                status: `Impossibile scaricare l'aggiornamento v${versione}, ne dalla rete locale ne da Internet. Riprovo piu tardi.`,
                finished: true,
                isError: true
            });
        });
        return true;
    } catch (e) {
        _isDownloading = false;
        return false;
    }
}

async function maybeAdoptLanUpdate(version, peerIp, peerPort, richiestoDaUtente = false) {
    if (isUpdateInProgress() || !version || !peerIp) return;
    if (!richiestoDaUtente && !updatePolicy.coreInstallazioneAutomatica()) {
        _broadcastToWindows('update-status', {
            status: `Aggiornamento v${version} disponibile su un altro computer dello studio. Avvialo da Amministratore > Aggiornamenti & Cache.`,
            finished: true,
            available: true,
            version
        });
        return;
    }

    const updatesManager = require('../updates_manager');
    if (updatesManager.compareVersions(version, app.getVersion()) <= 0) return;

    const stato = _statoFallimento(version);
    if (!richiestoDaUtente && Date.now() < stato.prossimoTentativo) return;

    _adoptingLan = true;
    try {
        const porta = peerPort || 34567;
        const info = await lanUpdateFetcher.infoDaPari(peerIp, porta);
        const versioneBersaglio = info && info.version ? info.version : version;
        if (updatesManager.compareVersions(versioneBersaglio, app.getVersion()) <= 0) return;

        const attesa = info ? info.sha512 : null;
        const destinazione = updatesManager.getTargetInstallerPath(versioneBersaglio);
        if (!destinazione) return;

        if (await lanUpdateFetcher.verificaFile(destinazione, attesa)) {
            _azzeraFallimenti(versioneBersaglio);
            _pendingVersion = versioneBersaglio;
            _broadcastToWindows('update-ready-for-install', { version: versioneBersaglio, source: `Rete Locale (${peerIp})` });
            return;
        }

        _isDownloading = true;
        const esito = await lanUpdateFetcher.scaricaDallaRete({
            versione: versioneBersaglio,
            candidati: _candidatiPerVersione(versioneBersaglio, peerIp, porta),
            destinazione,
            atteso: attesa,
            onLog: messaggio => console.log(messaggio),
            onTentativo: candidato => {
                _broadcastToWindows('update-status', {
                    status: `Download aggiornamento v${versioneBersaglio} dalla rete locale (${candidato.ip})...`,
                    finished: false
                });
            },
            onProgress: avanzamento => {
                _broadcastToWindows('update-download-progress', {
                    percent: avanzamento.percentuale,
                    transferred: avanzamento.ricevuti,
                    total: avanzamento.totale,
                    source: 'Rete Locale'
                });
            }
        });

        if (esito.riuscito) {
            _azzeraFallimenti(versioneBersaglio);
            _pendingVersion = versioneBersaglio;
            _broadcastToWindows('update-status', {
                status: `Aggiornamento v${versioneBersaglio} scaricato e verificato.`,
                finished: true
            });
            _broadcastToWindows('update-ready-for-install', { version: versioneBersaglio, source: `Rete Locale (${esito.fonte})` });
            try {
                const { broadcastUpdateAvailable } = require('../sync');
                if (typeof broadcastUpdateAvailable === 'function') broadcastUpdateAvailable(versioneBersaglio);
            } catch (_) {}
            return;
        }

        const fallimento = _registraFallimento(versioneBersaglio);
        console.warn(`[Update LAN] tentativo ${fallimento.conteggio} fallito: ${esito.motivo}`);

        if (fallimento.conteggio >= TENTATIVI_PRIMA_DEL_RIPIEGO) {
            _ripiegaSuRepository(versioneBersaglio, esito.motivo);
            return;
        }

        const secondi = Math.round((fallimento.prossimoTentativo - Date.now()) / 1000);
        _broadcastToWindows('update-status', {
            status: `Trasferimento da rete locale interrotto: ${esito.motivo}. Nuovo tentativo fra ${secondi} secondi.`,
            finished: true,
            isError: true
        });
    } catch (errore) {
        _registraFallimento(version);
        console.error('[Update LAN] errore imprevisto:', errore.message);
    } finally {
        _isDownloading = false;
        _adoptingLan = false;
    }
}

function setupUpdaterService(windowManager) {
    try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.disableWebInstaller = true;
        try {
            if (autoUpdater.app) {
                autoUpdater.app.baseCachePath = app.getPath('userData');
            }
        } catch (eCache) {}
        const updatesManager = require('../updates_manager');

        autoUpdater.on('checking-for-update', () => {
            if (_isManualCheck) {
                _broadcastToWindows('update-status', { status: 'Ricerca aggiornamenti...' });
            }
        });

        autoUpdater.on('update-available', async (info) => {
            if (isUpdateInProgress()) return;
            const targetVersion = info.version;
            const updatesManager = require('../updates_manager');
            if (updatesManager.compareVersions(targetVersion, app.getVersion()) <= 0) return;

            if (!updatePolicy.coreInstallazioneAutomatica() && !_isManualCheck) {
                _broadcastToWindows('update-status', {
                    status: `Aggiornamento v${targetVersion} disponibile. Avvialo da Amministratore > Aggiornamenti & Cache.`,
                    finished: true,
                    available: true,
                    version: targetVersion
                });
                return;
            }

            const { getDetailedNodes } = require('../sync');
            const lanNodes = getDetailedNodes().filter(n => n.ip !== '127.0.0.1' && n.status === 'Online');
            let foundInLan = false;
            for (const node of lanNodes) {
                if (node.updateReadyVersion === targetVersion) {
                    foundInLan = true;
                    maybeAdoptLanUpdate(targetVersion, node.ip, node.port);
                    break;
                }
            }

            if (!foundInLan) {
                _isDownloading = true;
                _broadcastToWindows('update-status', {
                    status: `Download aggiornamento v${targetVersion} in corso...`,
                    finished: false
                });
                autoUpdater.downloadUpdate().catch(() => {
                    _isDownloading = false;
                    if (_isManualCheck) {
                        _broadcastToWindows('update-status', {
                            status: 'Download aggiornamento fallito. Riprova più tardi.',
                            finished: true,
                            isError: true
                        });
                    }
                });
            }
        });

        autoUpdater.on('update-not-available', () => {
            if (_isManualCheck) {
                _broadcastToWindows('update-status', {
                    status: 'Sei già aggiornato all\'ultima versione.',
                    finished: true
                });
            }
            _isDownloading = false;
            _isManualCheck = false;
        });

        autoUpdater.on('error', (err) => {
            if (_isManualCheck) {
                _broadcastToWindows('update-status', {
                    status: 'Impossibile verificare aggiornamenti online.',
                    finished: true,
                    isError: true
                });
            }
            _isDownloading = false;
            _isManualCheck = false;
        });

        autoUpdater.on('download-progress', (progressObj) => {
            _broadcastToWindows('update-download-progress', {
                percent: progressObj.percent,
                transferred: progressObj.transferred,
                total: progressObj.total,
                source: 'GitHub Cloud'
            });
        });

        autoUpdater.on('update-downloaded', async (info) => {
            try {
                _isDownloading = false;
                _pendingVersion = info.version;
                if (info.downloadedFile && fs.existsSync(info.downloadedFile)) {
                    try {
                        const stream = fs.createReadStream(info.downloadedFile);
                        await updatesManager.saveInstallerFromStream(info.version, stream);
                    } catch (_) {}
                }
                try {
                    const { broadcastUpdateAvailable } = require('../sync');
                    if (typeof broadcastUpdateAvailable === 'function') broadcastUpdateAvailable(info.version);
                } catch (_) {}
                _broadcastToWindows('update-status', {
                    status: `Aggiornamento v${info.version} pronto per l'installazione.`,
                    finished: true,
                    source: 'GitHub Cloud'
                });
                _broadcastToWindows('update-ready-for-install', { version: info.version, source: 'GitHub Cloud' });
            } catch (_) {} finally {
                _isManualCheck = false;
            }
        });

        setTimeout(() => {
            try {
                _controlloPeriodico();
            } catch (_) {}
        }, 20000);

        updatePolicy.osservaCambiamenti(() => {
            try { _riprogrammaControllo(); } catch (_) {}
        });

        _riprogrammaControllo();
    } catch (_) {}
}

function _controlloPeriodico() {
    try {
        if (!updatePolicy.coreAutoCheckAttivo()) return;
        if (isUpdateInProgress()) return;
        const { autoUpdater } = require('electron-updater');
        _isManualCheck = false;
        autoUpdater.checkForUpdates().catch(() => {});
    } catch (_) {}
}

function _riprogrammaControllo() {
    try {
        if (_intervalloId) {
            clearInterval(_intervalloId);
            _intervalloId = null;
        }
        if (!updatePolicy.coreAutoCheckAttivo()) return;
        _intervalloId = setInterval(() => {
            try { _controlloPeriodico(); } catch (_) {}
        }, updatePolicy.coreIntervalloMs());
    } catch (_) {}
}

function checkUpdatesManual() {
    try {
        _isManualCheck = true;
        const { autoUpdater } = require('electron-updater');
        return autoUpdater.checkForUpdates();
    } catch (e) {
        _isManualCheck = false;
        return Promise.reject(e);
    }
}

module.exports = {
    setupUpdaterService,
    maybeAdoptLanUpdate,
    getPendingUpdateVersion,
    checkUpdateConsensus,
    installPendingUpdateNow,
    isUpdateInProgress,
    forceUpdateConsensus,
    checkUpdatesManual
};
