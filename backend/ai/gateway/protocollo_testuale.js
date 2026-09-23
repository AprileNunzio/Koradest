'use strict';

const APERTURA = '<strumento>';
const CHIUSURA = '</strumento>';
const MASSIMO_DESCRIZIONE = 160;
const BLOCCO = /<strumento>\s*([\s\S]*?)\s*<\/strumento>/gi;
const RECINTO = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;

const riassunto = testo => (String(testo || '').length > MASSIMO_DESCRIZIONE ? `${String(testo).slice(0, MASSIMO_DESCRIZIONE - 1)}…` : String(testo || ''));

function firma(strumento) {
    const proprieta = (strumento.parametri && strumento.parametri.properties) || {};
    const obbligatori = new Set((strumento.parametri && strumento.parametri.required) || []);
    const parametri = Object.entries(proprieta).map(([nome, schema]) => `${nome}${obbligatori.has(nome) ? '*' : ''}:${(schema && schema.type) || 'any'}`);
    return `- ${strumento.nome}(${parametri.join(', ')}): ${riassunto(strumento.descrizione)}`;
}

function istruzioni(strumenti) {
    if (!strumenti.length) return '';
    return [
        '[STRUMENTI]',
        'Per usare uno strumento rispondi SOLO con questo blocco, senza altro testo:',
        `${APERTURA}{"nome": "nome_strumento", "argomenti": {"parametro": "valore"}}${CHIUSURA}`,
        'Un blocco per ogni strumento. Riceverai il risultato e poi potrai continuare. I parametri con * sono obbligatori.',
        ...strumenti.map(firma)
    ].join('\n');
}

function leggiOggetto(testo) {
    try {
        const valore = JSON.parse(testo);
        return valore && typeof valore === 'object' && !Array.isArray(valore) ? valore : null;
    } catch (errore) {
        return null;
    }
}

function normalizzaChiamata(oggetto) {
    if (!oggetto) return null;
    const nome = oggetto.nome || oggetto.name || oggetto.strumento || oggetto.tool || (oggetto.function && oggetto.function.name);
    const grezzi = oggetto.argomenti ?? oggetto.arguments ?? oggetto.parameters ?? (oggetto.function && oggetto.function.arguments) ?? {};
    const argomenti = typeof grezzi === 'string' ? leggiOggetto(grezzi) : grezzi;
    if (typeof nome !== 'string' || !argomenti || typeof argomenti !== 'object' || Array.isArray(argomenti)) return null;
    return { nome, argomenti };
}

function candidati(testo) {
    const blocchi = [...String(testo || '').matchAll(BLOCCO)].map(corrispondenza => corrispondenza[1]);
    if (blocchi.length) return blocchi;
    const recinti = [...String(testo || '').matchAll(RECINTO)].map(corrispondenza => corrispondenza[1]);
    if (recinti.length) return recinti;
    const nudo = String(testo || '').trim();
    return nudo.startsWith('{') && nudo.endsWith('}') ? [nudo] : [];
}

function estrai(testo, nomiValidi) {
    const validi = new Set(nomiValidi);
    const chiamate = candidati(testo)
        .map(candidato => normalizzaChiamata(leggiOggetto(candidato)))
        .filter(chiamata => chiamata && validi.has(chiamata.nome))
        .map((chiamata, indice) => ({ id: `testo-${indice}`, ...chiamata }));
    const residuo = chiamate.length ? String(testo).replace(BLOCCO, '').replace(RECINTO, '').trim() : String(testo || '');
    return { chiamate, testo: chiamate.length && residuo.startsWith('{') ? '' : residuo };
}

const bloccoChiamata = chiamata => `${APERTURA}${JSON.stringify({ nome: chiamata.nome, argomenti: chiamata.argomenti || {} })}${CHIUSURA}`;

function inTesto(messaggio) {
    if (messaggio.ruolo === 'strumento') {
        return { ruolo: 'utente', testo: `[RISULTATO ${messaggio.risultato.nome}]\n${JSON.stringify(messaggio.risultato.dati)}` };
    }
    if (Array.isArray(messaggio.chiamate) && messaggio.chiamate.length) {
        return { ruolo: messaggio.ruolo, testo: [messaggio.testo, ...messaggio.chiamate.map(bloccoChiamata)].filter(Boolean).join('\n') };
    }
    return messaggio;
}

function conversazioneTestuale(messaggi, strumenti) {
    const convertiti = messaggi.map(inTesto);
    const catalogo = istruzioni(strumenti);
    if (!catalogo) return convertiti;
    const [primo, ...resto] = convertiti;
    if (primo && primo.ruolo === 'sistema') return [{ ...primo, testo: `${primo.testo}\n\n${catalogo}` }, ...resto];
    return [{ ruolo: 'sistema', testo: catalogo }, ...convertiti];
}

module.exports = { istruzioni, estrai, conversazioneTestuale, firma };
