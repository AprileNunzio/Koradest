'use strict';

const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');

const VIETATI = [
    /(^|[\\/])\.env(\.|$)/i,
    /(^|[\\/])\.(claude|agents|cursor|gemini|github)([\\/]|$)/i,
    /(^|[\\/])(CLAUDE|AGENTS|GEMINI)\.md$/i,
    /(^|[\\/])\.cursorrules$/i,
    /(^|[\\/])copilot-instructions\.md$/i,
    /\.(pem|key|pfx|p12|sqlite|sqlite3|db|enc|bak)$/i,
    /(^|[\\/])active_node\.json$/i,
    /^[\\/](tests|scripts|docs|logs|dist|scratch)[\\/]/i
];

function trovaAsar(cartella) {
    const candidato = path.join(cartella, 'win-unpacked', 'resources', 'app.asar');
    if (fs.existsSync(candidato)) return candidato;
    throw new Error(`app.asar non trovato in ${cartella}`);
}

function main() {
    const cartella = path.resolve(process.argv[2] || process.env.KORADEST_DIST_DIR || path.join(__dirname, '..', 'dist'));
    const archivio = trovaAsar(cartella);
    const voci = asar.listPackage(archivio, { isPack: false });
    const proprie = voci.filter(voce => !/^[\\/]node_modules[\\/]/.test(voce));
    const violazioni = proprie.filter(voce => VIETATI.some(regola => regola.test(voce)));
    console.log(`Voci nel pacchetto: ${voci.length} (${proprie.length} fuori da node_modules)`);
    if (violazioni.length > 0) {
        console.log(`\nFile che non devono essere pubblicati: ${violazioni.length}`);
        violazioni.forEach(voce => console.log(`  - ${voce}`));
        process.exit(1);
    }
    console.log('Nessun file sensibile, riservato alle AI o di sviluppo nel pacchetto.');
}

main();
