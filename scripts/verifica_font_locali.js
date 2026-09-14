'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const SORGENTI = [path.join(RADICE, 'src'), path.join(RADICE, 'main.js'), path.join(RADICE, 'preload.js')];
const DOMINI_VIETATI = ['fonts.googleapis.com', 'fonts.gstatic.com', 'ajax.googleapis.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];

function raccogli(percorso, esiti = []) {
    const stato = fs.statSync(percorso);
    if (stato.isFile()) {
        if (/\.(js|html|css)$/.test(percorso)) esiti.push(percorso);
        return esiti;
    }
    for (const voce of fs.readdirSync(percorso, { withFileTypes: true })) {
        const figlio = path.join(percorso, voce.name);
        if (voce.isDirectory()) raccogli(figlio, esiti);
        else if (/\.(js|html|css)$/.test(voce.name)) esiti.push(figlio);
    }
    return esiti;
}

function main() {
    const file = SORGENTI.flatMap(s => raccogli(s));
    const violazioni = [];
    for (const percorso of file) {
        const testo = fs.readFileSync(percorso, 'utf8');
        for (const dominio of DOMINI_VIETATI) {
            if (testo.includes(dominio)) {
                violazioni.push({ percorso: path.relative(RADICE, percorso), dominio });
            }
        }
    }

    const foglio = path.join(RADICE, 'src', 'css', 'fonts.css');
    const mancanti = [];
    if (!fs.existsSync(foglio)) {
        mancanti.push('src/css/fonts.css');
    } else {
        const css = fs.readFileSync(foglio, 'utf8');
        for (const trovato of css.matchAll(/url\('\.\.\/([^']+)'\)/g)) {
            const atteso = path.join(RADICE, 'src', trovato[1]);
            if (!fs.existsSync(atteso)) mancanti.push(trovato[1]);
        }
    }

    console.log(`File analizzati: ${file.length}`);
    if (violazioni.length > 0) {
        console.log(`\nRisorse remote ancora referenziate: ${violazioni.length}`);
        for (const v of violazioni) console.log(`  ${v.percorso} -> ${v.dominio}`);
    }
    if (mancanti.length > 0) {
        console.log(`\nFile di font dichiarati ma assenti: ${mancanti.length}`);
        for (const m of mancanti) console.log('  ' + m);
    }
    if (violazioni.length === 0 && mancanti.length === 0) {
        console.log('Nessuna risorsa remota: tutti i font sono serviti localmente.');
        process.exit(0);
    }
    process.exit(1);
}

main();
