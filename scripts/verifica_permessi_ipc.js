'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const SORGENTI = [
    path.join(RADICE, 'backend', 'core', 'ipcRouter.js'),
    path.join(RADICE, 'backend', 'networks', 'handlers', 'networks_channels.js')
];

function canaliRegistrati() {
    const trovati = new Set();
    for (const file of SORGENTI) {
        const testo = fs.readFileSync(file, 'utf8');
        for (const m of testo.matchAll(/ipcMain\.handle\(\s*'([^']+)'/g)) trovati.add(m[1]);
        for (const m of testo.matchAll(/^\s*'(networks:[^']+)'\s*:/gm)) trovati.add(m[1]);
    }
    return trovati;
}

function main() {
    const policy = require(path.join(RADICE, 'backend', 'security', 'ipc_policy.js'));
    const registrati = canaliRegistrati();
    const classificati = new Set(policy.classifiedChannels());

    const senzaPolitica = [...registrati].filter(c => !classificati.has(c)).sort();
    const politicheOrfane = [...classificati].filter(c => !registrati.has(c)).sort();

    console.log(`Canali IPC registrati: ${registrati.size}`);
    console.log(`Canali con politica di accesso: ${classificati.size}`);

    if (senzaPolitica.length > 0) {
        console.log(`\nCanali SENZA politica (verrebbero negati a runtime): ${senzaPolitica.length}`);
        for (const c of senzaPolitica) console.log('  - ' + c);
    }
    if (politicheOrfane.length > 0) {
        console.log(`\nPolitiche che non corrispondono ad alcun canale: ${politicheOrfane.length}`);
        for (const c of politicheOrfane) console.log('  - ' + c);
    }

    if (senzaPolitica.length === 0 && politicheOrfane.length === 0) {
        console.log('\nOgni canale IPC ha una politica di accesso e ogni politica corrisponde a un canale.');
        process.exit(0);
    }
    process.exit(1);
}

main();
