'use strict';

const procedurale = require('./memoria_procedurale');
const lezioni = require('./lezioni');
const memoriaUtente = require('./memoria_utente');
const { radici, radiciVerbi } = require('../selezione_strumenti');

const MASSIMO_EPISODI_APERTI = 100;
const DURATA_EPISODIO_MS = 1000 * 60 * 60 * 6;

const impronta = testo => [...new Set([...radici(testo), ...radiciVerbi(testo)])].filter(radice => !/\d/.test(radice)).sort();

function creaApprendimento({ archivio, dataProtector, generaId }) {
    const episodi = new Map();

    const modifica = (operazione) => {
        const dati = archivio.leggi();
        const esito = operazione(dati);
        archivio.scrivi(dati);
        return esito;
    };

    const ricordaEpisodio = (episodio) => {
        const id = generaId();
        episodi.set(id, { ...episodio, scadenza: Date.now() + DURATA_EPISODIO_MS });
        [...episodi.entries()].filter(([, voce]) => voce.scadenza < Date.now()).forEach(([chiave]) => episodi.delete(chiave));
        while (episodi.size > MASSIMO_EPISODI_APERTI) episodi.delete(episodi.keys().next().value);
        return id;
    };

    function suggerimenti(richiesta) {
        return procedurale.suggerisci(archivio.leggi(), impronta(richiesta));
    }

    function arricchisci(strumento) {
        const aggiunta = lezioni.nota(archivio.leggi(), strumento.nome);
        return aggiunta ? Object.freeze({ ...strumento, descrizione: `${strumento.descrizione}${aggiunta}` }) : strumento;
    }

    function concludi({ richiesta, eseguiti, riuscito, corretto, strumentoNoto }) {
        const sequenza = [...new Set(eseguiti.filter(voce => voce.esito === 'ok' && strumentoNoto(voce.nome)).map(voce => voce.nome))];
        const episodio = { radici: impronta(richiesta), sequenza };
        modifica((dati) => {
            lezioni.registra(dati, eseguiti, strumentoNoto);
            if (sequenza.length) procedurale.impara(dati, { ...episodio, riuscito });
            dati.statistiche.richieste += 1;
            if (riuscito) dati.statistiche.riuscite += 1;
            if (corretto) dati.statistiche.correzioni += 1;
        });
        return ricordaEpisodio(episodio);
    }

    function valuta(id, voto) {
        const episodio = episodi.get(String(id || ''));
        if (!episodio) throw new Error('Risposta non trovata o troppo vecchia per essere valutata');
        if (!['su', 'giu'].includes(voto)) throw new Error('Voto non valido');
        episodi.delete(String(id));
        return modifica((dati) => {
            if (voto === 'su') {
                dati.statistiche.votiPositivi += 1;
                if (episodio.sequenza.length) procedurale.impara(dati, { ...episodio, riuscito: true });
            } else {
                dati.statistiche.votiNegativi += 1;
                if (episodio.sequenza.length) procedurale.penalizza(dati, episodio);
            }
            return { registrato: true };
        });
    }

    const conta = campo => modifica((dati) => { dati.statistiche[campo] += 1; });

    function statistiche() {
        const dati = archivio.leggi();
        return {
            ...dati.statistiche,
            esperienze: dati.esperienze.length,
            strumentiConLezioni: Object.keys(dati.lezioni).length,
            utentiConMemoria: Object.values(dati.utenti).filter(ricordi => ricordi.length).length,
            persistente: archivio.persistente()
        };
    }

    return Object.freeze({
        suggerimenti,
        arricchisci,
        concludi,
        valuta,
        registraConferma: approvata => conta(approvata ? 'conferme' : 'rifiuti'),
        ricorda: (utenteId, testo) => modifica(dati => memoriaUtente.ricorda(dati, utenteId, testo, dataProtector)),
        dimentica: (utenteId, cosa) => modifica(dati => memoriaUtente.dimentica(dati, utenteId, cosa)),
        ricordi: utenteId => memoriaUtente.elenco(archivio.leggi(), utenteId),
        istruzioniUtente: utenteId => memoriaUtente.perIstruzioni(archivio.leggi(), utenteId),
        statistiche,
        azzera: () => {
            episodi.clear();
            archivio.azzera();
            return statistiche();
        }
    });
}

module.exports = { creaApprendimento, impronta };
