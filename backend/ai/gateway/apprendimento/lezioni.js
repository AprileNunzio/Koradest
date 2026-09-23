'use strict';

const MASSIMO_LEZIONI = 4;
const MASSIMO_TESTO = 160;
const MASSIMO_STRUMENTI = 300;
const ESCLUSI = new Set(['NEGATO', 'ANNULLATO']);

const pulisci = testo => String(testo || '').replace(/\s+/g, ' ').replace(/[<>`]/g, '').trim().slice(0, MASSIMO_TESTO);

function voceDi(dati, nome) {
    if (!dati.lezioni[nome]) {
        if (Object.keys(dati.lezioni).length >= MASSIMO_STRUMENTI) return null;
        dati.lezioni[nome] = { errori: [], argomenti: [] };
    }
    return dati.lezioni[nome];
}

function registra(dati, eseguiti, strumentoNoto) {
    eseguiti.filter(voce => strumentoNoto(voce.nome)).forEach((voce) => {
        const lezione = voceDi(dati, voce.nome);
        if (!lezione) return;
        if (voce.esito === 'ok') {
            lezione.argomenti = Object.keys(voce.argomenti || {}).filter(chiave => /^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(chiave)).slice(0, 12);
            return;
        }
        if (ESCLUSI.has(voce.stato) || !voce.errore) return;
        const testo = pulisci(voce.errore);
        const esistente = lezione.errori.find(errore => errore.testo === testo);
        if (esistente) esistente.volte += 1;
        else lezione.errori.push({ testo, volte: 1 });
        lezione.errori.sort((a, b) => b.volte - a.volte);
        lezione.errori.length = Math.min(lezione.errori.length, MASSIMO_LEZIONI);
    });
    return dati;
}

function nota(dati, nome) {
    const lezione = dati.lezioni[nome];
    if (!lezione) return '';
    const parti = [];
    if (lezione.argomenti.length) parti.push(`argomenti che hanno funzionato: ${lezione.argomenti.join(', ')}`);
    if (lezione.errori.length) parti.push(`errori già visti da evitare: ${lezione.errori.slice(0, 2).map(errore => `«${errore.testo}»`).join('; ')}`);
    return parti.length ? ` [Esperienza: ${parti.join('. ')}]` : '';
}

module.exports = { registra, nota };
