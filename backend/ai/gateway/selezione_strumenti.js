'use strict';

const PAROLE_VUOTE = new Set([
    'che', 'chi', 'con', 'per', 'tra', 'fra', 'una', 'uno', 'gli', 'dei', 'del', 'della', 'delle', 'degli', 'dal', 'dalla',
    'alla', 'alle', 'agli', 'allo', 'nel', 'nella', 'nelle', 'sul', 'sulla', 'mio', 'mia', 'miei', 'mie', 'tuo', 'questo', 'questa',
    'quello', 'quella', 'sono', 'sei', 'come', 'dove', 'quando', 'anche', 'poi', 'favore', 'jarvis', 'puoi', 'vorrei', 'grazie', 'euro'
]);

const FAMIGLIE = Object.freeze({
    crea: { verbi: ['aggiung', 'registr', 'inseris', 'inseri', 'crea', 'salva', 'segna', 'paga', 'pagat', 'versa', 'annota', 'metti'], azioni: /\.(salva|crea\w*|aggiungi\w*|registra\w*|versa|inserisci)$/ },
    cambia: { verbi: ['modific', 'aggiorn', 'correg', 'cambia', 'sposta'], azioni: /\.(salva|aggiorna\w*|modifica\w*)$/ },
    togli: { verbi: ['elimin', 'cancell', 'rimuov', 'togli'], azioni: /\.(elimina|rimuovi\w*|annulla)$/ }
});

const RISERVA_ELENCHI = 4;
const BONUS_APPRESO = 5;
const LETTURA = /.(elenco|leggi|cerca|riepilogo|prossime)$/;
const FALSI_VERBI = ['segnal', 'creazion'];

const normalizza = testo => String(testo || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const parole = testo => normalizza(testo).split(/[^a-z0-9]+/).filter(parola => parola.length >= 3 && !PAROLE_VUOTE.has(parola));
const eVerbo = parola => !FALSI_VERBI.some(falso => parola.startsWith(falso)) && Object.values(FAMIGLIE).some(famiglia => famiglia.verbi.some(verbo => parola.startsWith(verbo)));
const radici = testo => new Set(parole(testo).filter(parola => !eVerbo(parola)).map(parola => parola.slice(0, 5)));
const radiciVerbi = testo => new Set(parole(testo).filter(eVerbo).map(parola => parola.slice(0, 5)));
const appDi = nome => String(nome).split('__')[0];
const peso = strumento => JSON.stringify(strumento).length;
const comuni = (insieme, altro) => [...insieme].filter(radice => altro.has(radice)).length;

function famigliaDi(richiesta) {
    const elenco = parole(richiesta).filter(eVerbo);
    const trovata = Object.entries(FAMIGLIE).find(([, famiglia]) => elenco.some(parola => famiglia.verbi.some(verbo => parola.startsWith(verbo))));
    return trovata ? trovata[0] : null;
}

function analizza(strumento, richiesta) {
    const testo = `${strumento.nome.replace(/[_.]+/g, ' ')} ${strumento.descrizione}`;
    return { strumento, nomi: comuni(richiesta.nomi, radici(testo)), verbi: comuni(richiesta.verbi, radiciVerbi(testo)) };
}

function appDiRiferimento(analisi, appAttiva) {
    if (appAttiva) return appAttiva;
    const totali = new Map();
    analisi.filter(voce => voce.nomi > 0).forEach(voce => totali.set(appDi(voce.strumento.nome), (totali.get(appDi(voce.strumento.nome)) || 0) + voce.nomi));
    return [...totali.entries()].sort((a, b) => b[1] - a[1]).map(([app]) => app)[0] || null;
}

function punteggio(voce, riferimento, famiglia) {
    const nellaApp = appDi(voce.strumento.nome) === riferimento;
    if (voce.nomi === 0 && !(nellaApp && voce.verbi > 0)) return 0;
    const base = voce.nomi * 2 + voce.verbi * 0.75 + (nellaApp ? 3 : 0);
    if (!famiglia) return base + (LETTURA.test(voce.strumento.nome) ? 2 : 0) - (voce.strumento.modifica ? 2 : 0);
    const coerente = FAMIGLIE[famiglia].azioni.test(voce.strumento.nome);
    return base + (coerente ? 4 : 0) - (voce.strumento.modifica && !coerente ? 3 : 0);
}

function seleziona({ strumenti, richiesta, appAttiva = null, massimo = 12, budgetCaratteri = 12000, pesiAppresi = new Map() }) {
    const radiciRichiesta = { nomi: radici(richiesta), verbi: radiciVerbi(richiesta) };
    const famiglia = famigliaDi(richiesta);
    const analisi = strumenti.map(strumento => analizza(strumento, radiciRichiesta));
    const riferimento = appDiRiferimento(analisi, appAttiva);
    const ordinati = analisi
        .map(voce => ({ strumento: voce.strumento, punti: punteggio(voce, riferimento, famiglia) + BONUS_APPRESO * (pesiAppresi.get(voce.strumento.nome) || 0) }))
        .filter(voce => voce.punti > 0)
        .sort((a, b) => b.punti - a.punti)
        .map(voce => voce.strumento);

    const scelti = [];
    let usati = 0;
    const aggiungiFinoA = limite => (strumento) => {
        if (scelti.length >= limite || scelti.includes(strumento) || usati + peso(strumento) > budgetCaratteri) return;
        scelti.push(strumento);
        usati += peso(strumento);
    };

    ordinati.forEach(aggiungiFinoA(Math.max(1, massimo - RISERVA_ELENCHI)));
    if (riferimento) strumenti.filter(strumento => appDi(strumento.nome) === riferimento && LETTURA.test(strumento.nome)).forEach(aggiungiFinoA(massimo));
    ordinati.forEach(aggiungiFinoA(massimo));
    return scelti;
}

module.exports = { seleziona, radici, radiciVerbi, famigliaDi, appDiRiferimento };
