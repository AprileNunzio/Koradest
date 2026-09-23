'use strict';

const VERBI = Object.freeze([
    { radici: ['elenco', 'elenca', 'lista', 'list', 'getall', 'all', 'index', 'tutti'], testo: 'Elenca', scrive: false },
    { radici: ['leggi', 'get', 'dettaglio', 'detail', 'show', 'scheda', 'apri', 'fetch', 'load'], testo: 'Legge il dettaglio di', scrive: false },
    { radici: ['cerca', 'search', 'find', 'trova', 'filtra', 'query'], testo: 'Cerca', scrive: false },
    { radici: ['riepilogo', 'stat', 'stats', 'statistiche', 'summary', 'dashboard', 'cruscotto', 'conta', 'count', 'report'], testo: 'Riassume', scrive: false },
    { radici: ['esporta', 'export', 'stampa', 'print', 'scarica', 'download'], testo: 'Esporta', scrive: false },
    { radici: ['salva', 'save', 'crea', 'create', 'add', 'aggiungi', 'nuovo', 'new', 'insert', 'inserisci', 'registra', 'upsert'], testo: 'Crea o aggiorna', scrive: true },
    { radici: ['aggiorna', 'update', 'modifica', 'edit', 'set', 'imposta', 'cambia', 'toggle', 'segna', 'assegna', 'sposta'], testo: 'Aggiorna', scrive: true },
    { radici: ['elimina', 'delete', 'remove', 'rimuovi', 'cancella', 'archivia', 'annulla', 'destroy', 'purge'], testo: 'Elimina o archivia', scrive: true },
    { radici: ['importa', 'import', 'carica', 'upload', 'sincronizza', 'sync'], testo: 'Importa', scrive: true },
    { radici: ['invia', 'send', 'notifica', 'notify', 'email', 'mail'], testo: 'Invia', scrive: true }
]);

function parole(nomeAzione) {
    return String(nomeAzione || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .map(parola => parola.toLowerCase())
        .filter(Boolean);
}

function verboDi(elenco) {
    for (let indice = elenco.length - 1; indice >= 0; indice -= 1) {
        const verbo = VERBI.find(voce => voce.radici.includes(elenco[indice]));
        if (verbo) return { verbo, indice };
    }
    return null;
}

function interpreta(nomeAzione) {
    const elenco = parole(nomeAzione);
    const trovato = verboDi(elenco);
    const eVerbo = parola => VERBI.some(voce => voce.radici.includes(parola));
    const entita = elenco.filter(parola => !eVerbo(parola)).join(' ') || 'dati';
    return {
        testo: trovato ? trovato.verbo.testo : 'Esegue l\'operazione',
        entita,
        scrive: trovato ? trovato.verbo.scrive : null
    };
}

function descrizioneAutomatica({ nomeAzione, nomeApp, descrizioneApp = null, parametri = [] }) {
    const { testo, entita } = interpreta(nomeAzione);
    const contesto = descrizioneApp ? ` (${String(descrizioneApp).slice(0, 120)})` : '';
    const campi = parametri.length ? ` Parametri: ${parametri.slice(0, 12).join(', ')}.` : '';
    return `${testo} ${entita} nell'app ${nomeApp}${contesto}.${campi} Descrizione dedotta dal nome dell'azione.`;
}

module.exports = { interpreta, descrizioneAutomatica };
