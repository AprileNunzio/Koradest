'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const { creaTarGz } = require('./archivio_tar');

const MODELLO = Object.freeze({
    nome: 'vosk-model-small-it-0.22',
    lingua: 'it',
    indirizzo: 'https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip',
    dimensioneMinima: 20 * 1024 * 1024,
    dimensioneMassima: 200 * 1024 * 1024,
    estrattoMassimo: 400 * 1024 * 1024
});
const HOST_AMMESSI = new Set(['alphacephei.com']);
const MASSIMO_REINDIRIZZAMENTI = 5;
const FILE_ARCHIVIO = `${MODELLO.nome}.tar.gz`;

function scarica(indirizzo, destinazione, alProgresso, registraRichiesta, reindirizzamenti = 0) {
    const url = new URL(indirizzo);
    if (url.protocol !== 'https:' || !HOST_AMMESSI.has(url.hostname)) return Promise.reject(new Error(`Origine del modello vocale non ammessa: ${url.hostname}`));
    return new Promise((resolve, reject) => {
        const richiesta = https.get(url, (risposta) => {
            if ([301, 302, 303, 307, 308].includes(risposta.statusCode) && risposta.headers.location) {
                risposta.resume();
                if (reindirizzamenti >= MASSIMO_REINDIRIZZAMENTI) return reject(new Error('Troppi reindirizzamenti'));
                return resolve(scarica(new URL(risposta.headers.location, url).toString(), destinazione, alProgresso, registraRichiesta, reindirizzamenti + 1));
            }
            if (risposta.statusCode !== 200) {
                risposta.resume();
                return reject(new Error(`Il server del modello vocale ha risposto ${risposta.statusCode}`));
            }
            const totale = Number(risposta.headers['content-length']) || 0;
            if (totale > MODELLO.dimensioneMassima) {
                risposta.destroy();
                return reject(new Error('Il modello vocale è più grande del previsto: scaricamento fermato'));
            }
            let completati = 0;
            const file = fs.createWriteStream(destinazione, { mode: 0o600 });
            risposta.on('data', (blocco) => {
                completati += blocco.length;
                if (completati > MODELLO.dimensioneMassima) risposta.destroy(new Error('Il modello vocale supera la dimensione massima ammessa'));
                alProgresso({ stato: 'scaricamento', completati, totale });
            });
            risposta.on('error', reject);
            file.on('error', reject);
            file.on('finish', () => (completati < MODELLO.dimensioneMinima ? reject(new Error('Il file scaricato è troppo piccolo per essere il modello vocale')) : resolve()));
            return risposta.pipe(file);
        });
        registraRichiesta(richiesta);
        richiesta.on('error', reject);
    });
}

function vociSicure(zip) {
    let totale = 0;
    return zip.getEntries().filter(voce => !voce.isDirectory).map((voce) => {
        const nome = voce.entryName.replace(/\\/g, '/');
        if (nome.startsWith('/') || nome.split('/').includes('..') || !nome.startsWith(`${MODELLO.nome}/`)) throw new Error(`Percorso non ammesso nel modello vocale: ${nome}`);
        totale += voce.header.size;
        if (totale > MODELLO.estrattoMassimo) throw new Error('Il modello vocale estratto supera la dimensione massima ammessa');
        return { nome, dati: voce.getData() };
    });
}

function creaModelloVoce({ cartella }) {
    const archivio = path.join(cartella, FILE_ARCHIVIO);
    const temporaneo = path.join(cartella, `${MODELLO.nome}.zip.part`);

    function stato() {
        const presente = fs.existsSync(archivio);
        return {
            nome: MODELLO.nome,
            lingua: MODELLO.lingua,
            installato: presente,
            dimensione: presente ? fs.statSync(archivio).size : 0,
            indirizzo: presente ? `/ai-voce/${FILE_ARCHIVIO}` : null
        };
    }

    function installa(alProgresso) {
        let richiesta = null;
        let annullato = false;
        const promessa = (async () => {
            fs.mkdirSync(cartella, { recursive: true });
            await scarica(MODELLO.indirizzo, temporaneo, alProgresso, (nuova) => { richiesta = nuova; });
            if (annullato) throw new Error('Scaricamento annullato');
            alProgresso({ stato: 'preparazione' });
            const voci = vociSicure(new AdmZip(temporaneo));
            fs.writeFileSync(`${archivio}.tmp`, creaTarGz(voci), { mode: 0o600 });
            fs.renameSync(`${archivio}.tmp`, archivio);
            return stato();
        })().finally(() => fs.rmSync(temporaneo, { force: true }));
        return {
            promessa,
            annulla: () => {
                annullato = true;
                if (richiesta) richiesta.destroy(new Error('Scaricamento annullato'));
            }
        };
    }

    function rimuovi() {
        fs.rmSync(archivio, { force: true });
        return stato();
    }

    const percorsoServito = nomeFile => (nomeFile === FILE_ARCHIVIO && fs.existsSync(archivio) ? archivio : null);

    return Object.freeze({ stato, installa, rimuovi, percorsoServito });
}

module.exports = { creaModelloVoce, MODELLO, FILE_ARCHIVIO, vociSicure };
