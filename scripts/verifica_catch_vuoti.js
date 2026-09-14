'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const CARTELLE = ['backend', 'src'];
const BILANCIO = path.join(__dirname, 'bilancio_catch_vuoti.json');
const REGEX = /catch\s*\([^)]*\)\s*\{\s*\}/g;

function raccogli(cartella, esiti = []) {
    for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
        const percorso = path.join(cartella, voce.name);
        if (voce.name === 'node_modules') continue;
        if (voce.isDirectory()) raccogli(percorso, esiti);
        else if (voce.name.endsWith('.js')) esiti.push(percorso);
    }
    return esiti;
}

function conta() {
    const perArea = {};
    let totale = 0;
    for (const cartella of CARTELLE) {
        for (const percorso of raccogli(path.join(RADICE, cartella))) {
            const testo = fs.readFileSync(percorso, 'utf8');
            const trovati = (testo.match(REGEX) || []).length;
            if (trovati === 0) continue;
            const relativo = path.relative(RADICE, percorso).replace(/\\/g, '/');
            const area = relativo.split('/').slice(0, 2).join('/');
            perArea[area] = (perArea[area] || 0) + trovati;
            totale += trovati;
        }
    }
    return { totale, perArea };
}

function leggiBilancio() {
    if (!fs.existsSync(BILANCIO)) return null;
    return JSON.parse(fs.readFileSync(BILANCIO, 'utf8'));
}

function main() {
    const attuale = conta();
    const aree = Object.entries(attuale.perArea).sort((a, b) => b[1] - a[1]);

    console.log(`Blocchi catch vuoti: ${attuale.totale}`);
    for (const [area, numero] of aree) console.log(`  ${area}: ${numero}`);

    if (process.argv.includes('--aggiorna')) {
        fs.writeFileSync(BILANCIO, JSON.stringify({ totale: attuale.totale, perArea: attuale.perArea, aggiornatoIl: new Date().toISOString() }, null, 2) + '\n');
        console.log(`\nTetto aggiornato a ${attuale.totale}.`);
        process.exit(0);
    }

    const bilancio = leggiBilancio();
    if (!bilancio) {
        console.log('\nNessun tetto registrato. Eseguire: node scripts/verifica_catch_vuoti.js --aggiorna');
        process.exit(0);
    }

    console.log(`\nTetto consentito: ${bilancio.totale}`);
    if (attuale.totale > bilancio.totale) {
        console.log(`Sono stati introdotti ${attuale.totale - bilancio.totale} nuovi blocchi catch vuoti.`);
        console.log('Un errore inghiottito in silenzio non e verificabile: gestirlo o registrarlo.');
        process.exit(1);
    }
    if (attuale.totale < bilancio.totale) {
        console.log(`${bilancio.totale - attuale.totale} blocchi in meno rispetto al tetto: aggiornare con --aggiorna.`);
    } else {
        console.log('Nessun nuovo blocco catch vuoto introdotto.');
    }
    process.exit(0);
}

main();
