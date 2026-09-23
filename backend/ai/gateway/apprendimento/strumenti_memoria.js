'use strict';

const RICORDA = 'koradest__ricorda';
const DIMENTICA = 'koradest__dimentica';

const DEFINIZIONI = Object.freeze([
    {
        nome: RICORDA,
        descrizione: 'Memoria personale di Jarvis. Salva un fatto o una preferenza stabile dell\'utente (es. "il conto principale è Intesa", "chiamami Marco") quando l\'utente chiede di ricordarlo o lo ripete spesso. Mai password, codici o dati di terzi.',
        parametri: { type: 'object', properties: { fatto: { type: 'string', description: 'Il fatto da ricordare, in una frase breve' } }, required: ['fatto'] },
        modifica: false
    },
    {
        nome: DIMENTICA,
        descrizione: 'Memoria personale di Jarvis. Dimentica i ricordi che contengono una parola, oppure "tutto".',
        parametri: { type: 'object', properties: { cosa: { type: 'string', description: 'Parola contenuta nei ricordi da dimenticare, oppure "tutto"' } }, required: ['cosa'] },
        modifica: false
    }
]);

function creaStrumentiMemoria({ apprendimento, utenteId }) {
    const GESTORI = {
        [RICORDA]: ({ fatto }) => apprendimento.ricorda(utenteId, fatto),
        [DIMENTICA]: ({ cosa }) => apprendimento.dimentica(utenteId, cosa)
    };
    return Object.freeze({
        definizioni: DEFINIZIONI,
        gestisce: nome => Object.prototype.hasOwnProperty.call(GESTORI, nome),
        esegui: chiamata => GESTORI[chiamata.nome](chiamata.argomenti || {})
    });
}

module.exports = { creaStrumentiMemoria, RICORDA, DIMENTICA };
