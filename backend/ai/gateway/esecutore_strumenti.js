'use strict';

const { scomponi } = require('./schema_strumenti');
const { limita } = require('./limite_risultati');

const SORGENTE = 'core:ai';

function proteggiPerFornitoreEsterno(dati, dataProtector) {
    const testo = JSON.stringify(dati === undefined ? null : dati);
    const controllo = dataProtector.sanitizeInputPrompt(testo);
    if (!controllo.safe) return { errore: 'Risultato bloccato: i dati contengono istruzioni sospette (possibile prompt injection)' };
    return { dati: JSON.parse(controllo.text) };
}

function eseguiInterno(interno, chiamata, massimoCaratteri) {
    try {
        const risultato = interno.esegui(chiamata);
        return risultato && risultato.errore ? { errore: risultato.errore } : { dati: limita(risultato, massimoCaratteri) };
    } catch (errore) {
        return { errore: errore.message };
    }
}

function creaEsecutore({ utente, fornitoreEsterno, toolRegistry, rbacGuard, dataProtector, broker, registraEvento, massimoCaratteri = 6000, manuale = null, interni = [] }) {
    const gestori = [manuale, ...interni].filter(Boolean);
    return async (chiamata) => {
        const interno = gestori.find(gestore => gestore.gestisce(chiamata.nome));
        if (interno) {
            const esito = eseguiInterno(interno, chiamata, massimoCaratteri);
            registraEvento(chiamata.nome, esito.errore ? 'FAILURE' : 'SUCCESS', esito.errore ? { errore: esito.errore } : null);
            return esito;
        }
        const strumento = toolRegistry.getTool(chiamata.nome);
        const destinazione = scomponi(chiamata.nome);
        if (!strumento || !destinazione) return { errore: `Strumento sconosciuto: ${chiamata.nome}` };

        const controllo = rbacGuard.validateExecution(utente, strumento.metadata || null, chiamata.nome);
        if (!controllo.allowed) {
            registraEvento(chiamata.nome, 'DENIED', { motivo: controllo.error });
            return { errore: controllo.error, stato: 'NEGATO' };
        }

        const esito = await broker.routeIpcCall(SORGENTE, destinazione.appId, destinazione.azione, chiamata.argomenti || {}, {
            origin: 'main',
            contesto: { userId: utente.id }
        }).then(dati => ({ dati: limita(dati === undefined ? null : dati, massimoCaratteri) }), errore => ({ errore: errore.message }));

        registraEvento(chiamata.nome, esito.errore ? 'FAILURE' : 'SUCCESS', esito.errore ? { errore: esito.errore } : null);
        if (esito.errore || !fornitoreEsterno) return esito;
        return proteggiPerFornitoreEsterno(esito.dati, dataProtector);
    };
}

module.exports = { creaEsecutore, proteggiPerFornitoreEsterno };
