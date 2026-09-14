'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const RADICE = path.join(__dirname, '..');
const CARTELLA_FONT = path.join(RADICE, 'src', 'assets', 'fonts');
const FOGLIO = path.join(RADICE, 'src', 'css', 'fonts.css');

const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FAMIGLIE = [
    { nome: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap', sottoinsiemi: ['latin', 'latin-ext'] },
    { nome: 'Outfit', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap', sottoinsiemi: ['latin', 'latin-ext'] },
    { nome: 'Material Symbols Rounded', url: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=block', sottoinsiemi: null }
];

function scarica(url, binario = false) {
    return new Promise((risolvi, rifiuta) => {
        const richiesta = https.get(url, { headers: { 'User-Agent': AGENTE } }, (risposta) => {
            if (risposta.statusCode !== 200) {
                rifiuta(new Error(`HTTP ${risposta.statusCode} per ${url}`));
                risposta.resume();
                return;
            }
            const pezzi = [];
            risposta.on('data', c => pezzi.push(c));
            risposta.on('end', () => risolvi(binario ? Buffer.concat(pezzi) : Buffer.concat(pezzi).toString('utf8')));
        });
        richiesta.on('error', rifiuta);
        richiesta.setTimeout(30000, () => {
            richiesta.destroy();
            rifiuta(new Error(`Timeout su ${url}`));
        });
    });
}

function estraiBlocchi(css) {
    const blocchi = [];
    const regex = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
    let trovato;
    while ((trovato = regex.exec(css)) !== null) {
        blocchi.push({ sottoinsieme: trovato[1], corpo: trovato[2] });
    }
    if (blocchi.length === 0) {
        const semplice = /@font-face\s*\{([^}]+)\}/g;
        while ((trovato = semplice.exec(css)) !== null) {
            blocchi.push({ sottoinsieme: 'default', corpo: trovato[1] });
        }
    }
    return blocchi;
}

function valore(corpo, proprieta) {
    const trovato = new RegExp(proprieta + ':\\s*([^;]+);').exec(corpo);
    return trovato ? trovato[1].trim() : '';
}

function nomeFile(famiglia, peso, sottoinsieme) {
    const base = famiglia.toLowerCase().replace(/\s+/g, '-');
    return `${base}-${peso}-${sottoinsieme}.woff2`;
}

async function main() {
    fs.mkdirSync(CARTELLA_FONT, { recursive: true });
    const regole = [
        '/* Font serviti localmente dal pacchetto: nessuna richiesta verso CDN esterni. */',
        '/* Rigenerare con: node scripts/scarica_font.js */',
        ''
    ];
    let scaricati = 0;

    for (const famiglia of FAMIGLIE) {
        const css = await scarica(famiglia.url);
        const blocchi = estraiBlocchi(css);
        for (const blocco of blocchi) {
            if (famiglia.sottoinsiemi && !famiglia.sottoinsiemi.includes(blocco.sottoinsieme)) continue;
            const sorgente = /url\((https:[^)]+)\)/.exec(blocco.corpo);
            if (!sorgente) continue;
            const peso = valore(blocco.corpo, 'font-weight').replace(/\s+/g, '-') || '400';
            const stile = valore(blocco.corpo, 'font-style') || 'normal';
            const intervallo = valore(blocco.corpo, 'unicode-range');
            const destinazione = nomeFile(famiglia.nome, peso, blocco.sottoinsieme);
            const contenuto = await scarica(sorgente[1], true);
            fs.writeFileSync(path.join(CARTELLA_FONT, destinazione), contenuto);
            scaricati++;
            regole.push('@font-face {');
            regole.push(`    font-family: '${famiglia.nome}';`);
            regole.push(`    font-style: ${stile};`);
            regole.push(`    font-weight: ${peso};`);
            regole.push('    font-display: swap;');
            regole.push(`    src: url('../assets/fonts/${destinazione}') format('woff2');`);
            if (intervallo) regole.push(`    unicode-range: ${intervallo};`);
            regole.push('}');
            regole.push('');
            console.log(`  ${destinazione} (${Math.round(contenuto.length / 1024)} KB)`);
        }
    }

    regole.push('.material-symbols-rounded {');
    regole.push("    font-family: 'Material Symbols Rounded';");
    regole.push('    font-weight: normal;');
    regole.push('    font-style: normal;');
    regole.push('    font-size: 24px;');
    regole.push('    line-height: 1;');
    regole.push('    letter-spacing: normal;');
    regole.push('    text-transform: none;');
    regole.push('    display: inline-block;');
    regole.push('    white-space: nowrap;');
    regole.push('    word-wrap: normal;');
    regole.push('    direction: ltr;');
    regole.push("    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;");
    regole.push('    -webkit-font-smoothing: antialiased;');
    regole.push('}');
    regole.push('');

    fs.writeFileSync(FOGLIO, regole.join('\n'));
    console.log(`\n${scaricati} file scaricati in src/assets/fonts, foglio generato in src/css/fonts.css`);
}

main().catch(e => {
    console.error('Errore durante il download dei font:', e.message);
    process.exit(1);
});
