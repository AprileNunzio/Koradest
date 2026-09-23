'use strict';

const fs = require('fs');
const path = require('path');

const versione = String(process.argv[2] || require('../package.json').version).replace(/^v/, '');
const testo = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
const inizio = testo.indexOf(`## [${versione}]`);
if (inizio === -1) {
    console.error(`Nel CHANGELOG manca la sezione della versione ${versione}`);
    process.exit(1);
}
const corpo = testo.slice(testo.indexOf('\n', inizio) + 1);
const fine = corpo.search(/^## \[/m);
const sezione = (fine === -1 ? corpo : corpo.slice(0, fine)).trim();
process.stdout.write(`${sezione}\n\n### Integrità\nI codici SHA-256 dei file sono in \`SHA256SUMS.txt\`.\n`);
