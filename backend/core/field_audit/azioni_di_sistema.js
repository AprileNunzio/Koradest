'use strict';

const registro = require('./registro_audit');
const nomiOperatori = require('./nomi_operatori');
const { nomeValido, nomeInterno } = require('../change_capture/identificatori');

const PREFISSO_RISERVATO = 'koradest.';

function nomeRiservato(nome) {
    return String(nome).startsWith(PREFISSO_RISERVATO);
}

function autorizzato(ctx, ruoliDichiarati) {
    return Boolean(ctx.utente) && (ruoliDichiarati.length === 0 || ctx.ruoli.length > 0);
}

function crea({ archivio, ruoliDichiarati, ErroreApp, risolviNomi = nomiOperatori.risolvi }) {
    const controlla = (ctx) => {
        if (!autorizzato(ctx, ruoliDichiarati)) throw new ErroreApp('Non hai accesso allo storico di questa applicazione', 'RUOLO_MANCANTE');
    };

    const storico = (payload, ctx) => {
        controlla(ctx);
        if (!nomeValido(payload.tabella) || nomeInterno(payload.tabella)) throw new ErroreApp('Tabella non valida', 'DATI_NON_VALIDI');
        if (payload.campo && !nomeValido(payload.campo)) throw new ErroreApp('Campo non valido', 'DATI_NON_VALIDI');
        const voci = registro.storico(archivio(), { tabella: payload.tabella, recordId: payload.id, campo: payload.campo || null });
        const nomi = risolviNomi(voci.map(voce => voce.operatoreId));
        return voci.map(voce => ({ ...voce, operatore: voce.operatoreId ? (nomi[voce.operatoreId] || voce.operatoreId) : 'Sistema' }));
    };

    const verifica = (payload, ctx) => {
        controlla(ctx);
        return registro.verifica(archivio());
    };

    return [
        ['koradest.storico', { funzione: storico, ruoli: [], valida: { tabella: 'testo!', id: 'id!', campo: 'testo' }, modifica: false }],
        ['koradest.storico.verifica', { funzione: verifica, ruoli: [], valida: null, modifica: false }]
    ];
}

module.exports = { crea, nomeRiservato };
