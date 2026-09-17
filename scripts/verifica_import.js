'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const RADICI_SORGENTI = [path.join(RADICE, 'src', 'js')];
const PAGINA = path.join(RADICE, 'src', 'index.html');

const ESPRESSIONI = [
    /\bimport\s+[^'"();]*?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bexport\s+[^'"();]*?from\s*['"]([^'"]+)['"]/g
];

function raccogli(cartella, esiti = []) {
    if (!fs.existsSync(cartella)) return esiti;
    for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
        const percorso = path.join(cartella, voce.name);
        if (voce.isDirectory()) raccogli(percorso, esiti);
        else if (voce.name.endsWith('.js')) esiti.push(percorso);
    }
    return esiti;
}

function riferimenti(testo) {
    const trovati = new Set();
    for (const espressione of ESPRESSIONI) {
        for (const risultato of testo.matchAll(espressione)) trovati.add(risultato[1]);
    }
    return [...trovati];
}

function esterno(specificatore) {
    return !specificatore.startsWith('.') && !specificatore.startsWith('/');
}

function risolvi(origine, specificatore) {
    const base = specificatore.startsWith('/')
        ? path.join(RADICE, 'src', specificatore.slice(1))
        : path.resolve(path.dirname(origine), specificatore);
    const candidati = [base, `${base}.js`, path.join(base, 'index.js')];
    return candidati.some(candidato => fs.existsSync(candidato) && fs.statSync(candidato).isFile());
}

function collegamentiPagina() {
    if (!fs.existsSync(PAGINA)) return [];
    const testo = fs.readFileSync(PAGINA, 'utf8');
    const trovati = [];
    for (const risultato of testo.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
        const valore = risultato[1];
        if (/^(https?:|data:|#|mailto:)/.test(valore)) continue;
        trovati.push(valore);
    }
    return trovati;
}

function main() {
    const file = RADICI_SORGENTI.flatMap(radice => raccogli(radice));
    const rotti = [];

    for (const percorso of file) {
        const testo = fs.readFileSync(percorso, 'utf8');
        for (const specificatore of riferimenti(testo)) {
            if (esterno(specificatore)) continue;
            if (!risolvi(percorso, specificatore)) {
                rotti.push(`${path.relative(RADICE, percorso)} -> ${specificatore}`);
            }
        }
    }

    const risorse = [];
    for (const collegamento of collegamentiPagina()) {
        const assoluto = path.resolve(path.dirname(PAGINA), collegamento);
        if (!fs.existsSync(assoluto)) risorse.push(`src/index.html -> ${collegamento}`);
    }

    console.log(`File analizzati: ${file.length}`);
    console.log(`Import non risolti: ${rotti.length}`);
    rotti.forEach(voce => console.log(`  ${voce}`));
    console.log(`Risorse di index.html mancanti: ${risorse.length}`);
    risorse.forEach(voce => console.log(`  ${voce}`));

    if (rotti.length > 0 || risorse.length > 0) process.exit(1);
}

main();
