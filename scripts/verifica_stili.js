'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const SORGENTI = path.join(RADICE, 'src', 'js');
const FOGLI = [path.join(RADICE, 'src', 'css'), path.join(RADICE, 'src', 'js')];

const PREFISSI_NOSTRI = ['store-', 'info-', 'purge-', 'versione-', 'versioni-', 'app-', 'btn-', 'ds-', 'net-', 'k-', 'tb-', 'splash-', 'status-'];

const GANCI_JS = new Set([
    'btn-reset', 'btn-submit', 'btn-tab', 'btn-icon', 'btn-action', 'btn-danger',
    'btn-more-users', 'btn-open-app', 'btn-install-app'
]);

const ESTERNE = new Set([
    'material-symbols-rounded', 'input', 'spin', 'fade-in-up', 'active', 'locked',
    'page-container', 'text-title', 'text-body', 'search-box', 'apps-grid',
    'app-card', 'app-icon', 'app-title', 'app-desc', 'badge-new', 'badge-locked',
    'subapp-card', 'subapps-grid', 'update-badge', 'badge-updating', 'badge-done', 'badge-error'
]);

function raccogli(cartella, estensione, esiti = []) {
    for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
        const percorso = path.join(cartella, voce.name);
        if (voce.isDirectory()) raccogli(percorso, estensione, esiti);
        else if (voce.name.endsWith(estensione)) esiti.push(percorso);
    }
    return esiti;
}

function raccogliStiliInline() {
    const blocchi = [];
    for (const modulo of raccogli(SORGENTI, '.js')) {
        const testo = fs.readFileSync(modulo, 'utf8');
        for (const trovato of testo.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
            blocchi.push(trovato[1]);
        }
    }
    return blocchi;
}

function classiDefinite() {
    const definite = new Set();
    const sorgenti = FOGLI.flatMap(radice => raccogli(radice, '.css')).map(foglio => fs.readFileSync(foglio, 'utf8'));
    sorgenti.push(...raccogliStiliInline());
    for (const testo of sorgenti) {
        for (const trovato of testo.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
            definite.add(trovato[1]);
        }
    }
    return definite;
}

function nostra(classe) {
    return PREFISSI_NOSTRI.some(prefisso => classe.startsWith(prefisso));
}

function classiUsate(file) {
    const testo = fs.readFileSync(file, 'utf8');
    const usate = new Map();

    const registra = (valore, indice) => {
        for (const pezzo of String(valore).split(/\s+/)) {
            const classe = pezzo.trim();
            if (!classe || classe.includes('${') || classe.includes('$')) continue;
            if (!/^[a-zA-Z_][\w-]*$/.test(classe)) continue;
            if (!usate.has(classe)) {
                usate.set(classe, testo.slice(0, indice).split('\n').length);
            }
        }
    };

    for (const trovato of testo.matchAll(/class="([^"]*)"/g)) registra(trovato[1], trovato.index);
    for (const trovato of testo.matchAll(/className\s*=\s*'([^']*)'/g)) registra(trovato[1], trovato.index);
    for (const trovato of testo.matchAll(/className\s*=\s*"([^"]*)"/g)) registra(trovato[1], trovato.index);

    return usate;
}

function main() {
    const definite = classiDefinite();
    const problemi = [];

    for (const file of raccogli(SORGENTI, '.js')) {
        for (const [classe, riga] of classiUsate(file)) {
            if (ESTERNE.has(classe) || GANCI_JS.has(classe)) continue;
            if (!nostra(classe)) continue;
            if (definite.has(classe)) continue;
            problemi.push({ file: path.relative(RADICE, file), riga, classe });
        }
    }

    for (const problema of problemi) {
        console.log(`${problema.file}:${problema.riga}  classe "${problema.classe}" non definita in nessun foglio di src/css/`);
    }

    console.log(`\nClassi definite: ${definite.size}`);
    console.log(`Classi usate ma mai definite: ${problemi.length}`);
    process.exit(problemi.length === 0 ? 0 : 1);
}

main();
