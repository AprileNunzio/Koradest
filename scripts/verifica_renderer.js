'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const RADICE = path.join(__dirname, '..');
const SORGENTI = path.join(RADICE, 'src', 'js');

const NOME_NON_TROVATO = 2304;
const NOME_CON_SUGGERIMENTO = 2552;
const PROPRIETA_NON_ESISTE = 2339;

const CODICI_SORVEGLIATI = new Set([NOME_NON_TROVATO, NOME_CON_SUGGERIMENTO]);

const GLOBALI_NOSTRE = new Set([
    'Router', 'Pages', 'currentUser', 'electronAPI', 'koradestNative', 'toast'
]);

function raccogliFile(cartella, esiti = []) {
    for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
        const percorso = path.join(cartella, voce.name);
        if (voce.isDirectory()) raccogliFile(percorso, esiti);
        else if (voce.name.endsWith('.js')) esiti.push(percorso);
    }
    return esiti;
}

function nomeMancante(messaggio) {
    const trovato = /Cannot find name '([^']+)'/.exec(messaggio);
    return trovato ? trovato[1] : null;
}

function main() {
    const file = raccogliFile(SORGENTI);

    const programma = ts.createProgram(file, {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        strict: false,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true
    });

    const diagnostiche = ts.getPreEmitDiagnostics(programma);
    const problemi = [];

    for (const voce of diagnostiche) {
        if (!CODICI_SORVEGLIATI.has(voce.code)) continue;
        if (!voce.file || !voce.file.fileName.startsWith(SORGENTI.replace(/\\/g, '/'))
            && !voce.file.fileName.startsWith(SORGENTI)) continue;

        const messaggio = ts.flattenDiagnosticMessageText(voce.messageText, ' ');
        const nome = nomeMancante(messaggio);
        if (nome && GLOBALI_NOSTRE.has(nome)) continue;

        const posizione = voce.file.getLineAndCharacterOfPosition(voce.start);
        problemi.push({
            file: path.relative(RADICE, voce.file.fileName),
            riga: posizione.line + 1,
            colonna: posizione.character + 1,
            messaggio
        });
    }

    for (const problema of problemi) {
        console.log(`${problema.file}:${problema.riga}:${problema.colonna}  ${problema.messaggio}`);
    }

    console.log(`\nFile analizzati: ${file.length}`);
    console.log(`Identificativi inesistenti nel renderer: ${problemi.length}`);
    process.exit(problemi.length === 0 ? 0 : 1);
}

main();
