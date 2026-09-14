'use strict';

const fs = require('fs');
const path = require('path');
const banco = require('./verifica_store');

const { radice, archivioStore, verifica, riepiloga, manifestProva } = banco;

function fileEsiste(...pezzi) {
    return fs.existsSync(path.join(radice, ...pezzi));
}

function preparaInstallazione(versione) {
    const cartella = path.join(radice, 'installed_apps', manifestProva.folder);
    fs.mkdirSync(cartella, { recursive: true });
    fs.writeFileSync(path.join(cartella, 'manifest.json'), JSON.stringify({ ...manifestProva, version: versione }));
    fs.writeFileSync(path.join(cartella, 'backend.js'), 'modulo');
}

function preparaArchivioDati() {
    const dbs = path.join(radice, 'dbs', 'nodo-prova');
    fs.mkdirSync(path.join(dbs, 'backups'), { recursive: true });
    fs.writeFileSync(path.join(dbs, 'app_prova.enc'), 'dati clinici cifrati');
    fs.writeFileSync(path.join(dbs, 'app_prova.enc.tmp'), 'temporaneo');
    fs.writeFileSync(path.join(dbs, 'backups', 'app_prova.20260828.enc'), 'backup');
    fs.mkdirSync(path.join(radice, 'app_cache', 'app_prova'), { recursive: true });
    fs.writeFileSync(path.join(radice, 'app_cache', 'app_prova', 'x.tmp'), 'cache');
    fs.mkdirSync(path.join(radice, 'app_settings'), { recursive: true });
    fs.writeFileSync(path.join(radice, 'app_settings', 'app_prova.json'), '{"tema":"scuro"}');
    return dbs;
}

async function main() {
    const dbsDir = preparaArchivioDati();

    const dbManagerFinto = {
        initPaths() {},
        basePath: dbsDir,
        databases: { app_prova: {} }
    };
    require.cache[require.resolve('../backend/db/db_manager')] = { exports: dbManagerFinto, loaded: true, id: 'finto' };

    const store = require('../backend/handlers/store');
    const archivioVersioni = require('../backend/core/appVersionArchive');

    console.log('--- PUNTO 5: archivio versioni e rollback ---');
    for (const versione of ['1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6']) {
        archivioVersioni.conserva(archivioStore, 'app_prova', versione, Buffer.from(`pacchetto ${versione}`));
    }
    const conservate = archivioVersioni.elenca(archivioStore, 'app_prova');
    verifica('Conserva esattamente gli ultimi 5 pacchetti', conservate.length === 5, `${conservate.length} versioni`);
    verifica('Le versioni piu vecchie sono state potate',
        !conservate.some(r => r.version === '1.0.0' || r.version === '1.0.1'),
        conservate.map(r => r.version).join(', '));
    verifica('I file potati sono spariti dal disco',
        fs.readdirSync(path.join(radice, 'app_versions', 'app_prova')).length === 5);

    const rilettura = archivioVersioni.leggi(archivioStore, 'app_prova', '1.0.4');
    verifica('Un pacchetto conservato e rileggibile', rilettura !== null && rilettura.buffer.toString() === 'pacchetto 1.0.4');

    const percorsoManomesso = conservate[0].file_path;
    const originaleManomesso = fs.readFileSync(percorsoManomesso);
    fs.writeFileSync(percorsoManomesso, 'PACCHETTO SOSTITUITO DA UN ATTACCANTE');
    verifica('Un pacchetto alterato viene rifiutato dallo SHA-256',
        archivioVersioni.leggi(archivioStore, 'app_prova', conservate[0].version) === null);
    fs.writeFileSync(percorsoManomesso, originaleManomesso);

    console.log('\n--- PUNTO 2: nessuna operazione su app non installate ---');
    const senzaInstallazione = await store.checkUpdates();
    verifica('checkUpdates non propone nulla se l\'app non e installata',
        senzaInstallazione.success && senzaInstallazione.data.length === 0,
        JSON.stringify(senzaInstallazione.data));

    const versioneRifiutata = await store.installaVersione(null, { appId: 'app_prova', versione: '1.0.4' });
    verifica('installaVersione rifiuta se l\'app non e installata',
        versioneRifiutata.success === false && /non installata/i.test(versioneRifiutata.error),
        versioneRifiutata.error);

    console.log('\n--- PUNTO 1: disinstallazione totale ---');
    preparaInstallazione('1.0.3');
    archivioStore.run(
        "INSERT OR REPLACE INTO installed_apps (app_id, version, installed_at, updated_at, status) VALUES (?, ?, ?, ?, 'active')",
        ['app_prova', '1.0.3', 1787000000, 1787900000]
    );

    const anteprima = await store.anteprimaDisinstallazione(null, 'app_prova');
    verifica('L\'anteprima elenca cosa verra cancellato',
        anteprima.success && anteprima.data.quante >= 6, `${anteprima.data ? anteprima.data.quante : 0} elementi`);
    verifica('L\'anteprima nomina l\'archivio dati',
        anteprima.success && anteprima.data.voci.some(v => v.etichetta === 'Archivio dati'));

    const rimozione = await store.uninstall(null, 'app_prova');
    verifica('La disinstallazione riesce', rimozione.success === true, JSON.stringify(rimozione.error || ''));
    verifica('Riporta quanti elementi ha eliminato',
        rimozione.data && rimozione.data.rimossi > 0 && rimozione.data.completo === true,
        JSON.stringify(rimozione.data));

    verifica('Cartella del programma eliminata', !fileEsiste('installed_apps', manifestProva.folder));
    verifica('Archivio dati eliminato', !fs.existsSync(path.join(dbsDir, 'app_prova.enc')));
    verifica('File temporaneo dell\'archivio eliminato', !fs.existsSync(path.join(dbsDir, 'app_prova.enc.tmp')));
    verifica('Backup dell\'archivio eliminato', !fs.existsSync(path.join(dbsDir, 'backups', 'app_prova.20260828.enc')));
    verifica('Cache eliminata', !fileEsiste('app_cache', 'app_prova'));
    verifica('Impostazioni eliminate', !fileEsiste('app_settings', 'app_prova.json'));
    verifica('Archivio versioni eliminato', !fileEsiste('app_versions', 'app_prova'));
    verifica('Riga installed_apps rimossa',
        archivioStore.query('SELECT * FROM installed_apps WHERE app_id = ?', ['app_prova']).length === 0);
    verifica('Righe app_versioni rimosse',
        archivioStore.query('SELECT * FROM app_versioni WHERE app_id = ?', ['app_prova']).length === 0);
    verifica('La disinstallazione e tracciata nel registro',
        archivioStore.query("SELECT * FROM app_install_log WHERE app_id = ? AND action = 'uninstall'", ['app_prova']).length === 1);

    console.log('\n--- PUNTO 5b: gestione di una versione diversa ---');
    preparaInstallazione('1.0.6');
    archivioStore.run(
        "INSERT OR REPLACE INTO installed_apps (app_id, version, installed_at, updated_at, status) VALUES (?, ?, ?, ?, 'active')",
        ['app_prova', '1.0.6', 1787000000, 1787900000]
    );
    archivioVersioni.conserva(archivioStore, 'app_prova', '1.0.6', Buffer.from('pacchetto 1.0.6'));
    archivioVersioni.conserva(archivioStore, 'app_prova', '1.0.5', Buffer.from('pacchetto 1.0.5'));

    const elenco = await store.elencaVersioni(null, 'app_prova');
    verifica('elencaVersioni riporta le versioni disponibili',
        elenco.success && elenco.data.versioni.length >= 2,
        elenco.data ? elenco.data.versioni.map(v => v.version).join(', ') : '');
    verifica('Segnala quale versione e in uso',
        elenco.success && elenco.data.versioni.some(v => v.attuale && v.version === '1.0.6'));
    verifica('Dichiara quante versioni conserva', elenco.success && elenco.data.conservate === 5);

    const inesistente = await store.installaVersione(null, { appId: 'app_prova', versione: '9.9.9' });
    verifica('Rifiuta una versione non presente in archivio',
        inesistente.success === false && /non presente in archivio/i.test(inesistente.error || ''),
        inesistente.error);

    console.log('\n--- PUNTO 3: politica di aggiornamento automatico ---');
    const updatePolicy = require('../backend/core/updatePolicy');
    verifica('La politica espone il controllo automatico delle app',
        typeof updatePolicy.appsAutoCheckAttivo === 'function' && typeof updatePolicy.appsIntervalloMs === 'function');
    const bootSorgente = fs.readFileSync(path.join(__dirname, '..', 'backend', 'networks', 'lifecycle', 'runtime_bootstrap.js'), 'utf8');
    verifica('L attivazione di una rete avvia il controllo in background senza intervento umano',
        /startBackgroundCheck\(\)/.test(bootSorgente) && /startBackgroundDaemons/.test(bootSorgente));
    const gestoreSorgente = fs.readFileSync(path.join(__dirname, '..', 'backend', 'core', 'AppUpdateManager.js'), 'utf8');
    verifica('Il ciclo si riprogramma secondo la politica',
        /appsAutoCheckAttivo\(\)/.test(gestoreSorgente) && /appsIntervalloMs\(\)/.test(gestoreSorgente));
    verifica('L\'installazione automatica dipende dalla politica',
        /appsInstallazioneAutomatica\(\)/.test(gestoreSorgente));

    console.log('\n--- PUNTO 4: orari in lista ---');
    const sezione = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'pages', 'store', 'components', 'installed_section.js'), 'utf8');
    verifica('La lista formatta data e ora', /formatDataOra/.test(sezione) && /hour: '2-digit'/.test(sezione));
    verifica('La lista mostra sia installazione sia aggiornamento',
        /Installata il/.test(sezione) && /Aggiornata il/.test(sezione));
    verifica('Lo storico completo e nel tooltip', /title="\$\{storico\.join/.test(sezione));

    process.exit(riepiloga() ? 0 : 1);
}

main().catch(errore => {
    console.error('INTERROTTO:', errore);
    process.exit(1);
});
