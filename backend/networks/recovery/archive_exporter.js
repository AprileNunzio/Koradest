'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFESTO = 'koradest-archivio.json';

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _sha256(percorso) {
    return crypto.createHash('sha256').update(fs.readFileSync(percorso)).digest('hex');
}

function esportaArchivio(cartellaDestinazione) {
    const dbManager = require('../../db/db_manager');
    const networkSession = require('../session/network_session');
    if (!networkSession.isActive()) throw _expected('NETWORK_NOT_ACTIVE');
    if (!cartellaDestinazione) throw _expected('EXPORT_DESTINATION_MISSING');
    const origine = dbManager.basePath;
    if (!origine || !fs.existsSync(origine)) throw _expected('EXPORT_SOURCE_MISSING');

    const descrittore = networkSession.descriptor();
    const marcaTemporale = new Date().toISOString().replace(/[:.]/g, '-');
    const destinazione = path.join(cartellaDestinazione, `koradest-${networkSession.getActiveSlug()}-${marcaTemporale}`);
    fs.mkdirSync(destinazione, { recursive: true });

    const file = fs.readdirSync(origine).filter(f => f.endsWith('.enc'));
    if (file.length === 0) throw _expected('EXPORT_NOTHING_TO_COPY');

    const voci = [];
    let byteTotali = 0;
    for (const nome of file) {
        const sorgente = path.join(origine, nome);
        const copia = path.join(destinazione, nome);
        fs.copyFileSync(sorgente, copia);
        const dimensione = fs.statSync(copia).size;
        byteTotali += dimensione;
        voci.push({ file: nome, bytes: dimensione, sha256: _sha256(copia) });
    }

    const manifesto = {
        applicazione: 'Koradest',
        formato: 1,
        rete: { nome: descrittore.name, publicId: descrittore.publicId },
        creatoIl: Date.now(),
        avvertenza: 'Archivio cifrato. Serve il codice di sicurezza della rete per aprirlo: senza di esso questi file sono illeggibili.',
        file: voci
    };
    fs.writeFileSync(path.join(destinazione, MANIFESTO), JSON.stringify(manifesto, null, 2));
    return { destinazione, file: voci.length, bytes: byteTotali };
}

function verificaArchivio(cartella) {
    const percorsoManifesto = path.join(cartella, MANIFESTO);
    if (!fs.existsSync(percorsoManifesto)) throw _expected('EXPORT_MANIFEST_MISSING');
    const manifesto = JSON.parse(fs.readFileSync(percorsoManifesto, 'utf8'));
    const esiti = [];
    for (const voce of manifesto.file || []) {
        const percorso = path.join(cartella, voce.file);
        if (!fs.existsSync(percorso)) {
            esiti.push({ file: voce.file, stato: 'mancante' });
            continue;
        }
        esiti.push({ file: voce.file, stato: _sha256(percorso) === voce.sha256 ? 'integro' : 'alterato' });
    }
    return { rete: manifesto.rete, creatoIl: manifesto.creatoIl, esiti, integro: esiti.every(e => e.stato === 'integro') };
}

module.exports = { esportaArchivio, verificaArchivio, MANIFESTO };
