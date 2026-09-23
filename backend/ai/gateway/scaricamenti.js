'use strict';

const INTERVALLO_NOTIFICHE_MS = 250;

function creaScaricamenti({ notifica }) {
    const attivi = new Map();

    function avvia(chiave, { etichetta, esegui }) {
        if (attivi.has(chiave)) return { avviato: false, chiave, motivo: 'Scaricamento già in corso' };
        let ultimaNotifica = 0;
        const invia = (evento, forza = false) => {
            const adesso = Date.now();
            if (!forza && adesso - ultimaNotifica < INTERVALLO_NOTIFICHE_MS) return;
            ultimaNotifica = adesso;
            notifica({ chiave, etichetta, ...evento });
        };
        const alProgresso = ({ stato, completati = 0, totale = 0 }) => invia({ fase: 'in_corso', stato, completati, totale, percentuale: totale > 0 ? Math.min(100, Math.round((completati / totale) * 100)) : null });
        const lavoro = esegui(alProgresso);
        attivi.set(chiave, lavoro);
        invia({ fase: 'avviato' }, true);
        lavoro.promessa
            .then(() => invia({ fase: 'completato', percentuale: 100 }, true))
            .catch(errore => invia({ fase: 'errore', errore: errore.message }, true))
            .finally(() => attivi.delete(chiave));
        return { avviato: true, chiave };
    }

    function annulla(chiave) {
        const lavoro = attivi.get(chiave);
        if (!lavoro) return { annullato: false };
        lavoro.annulla();
        return { annullato: true };
    }

    return Object.freeze({ avvia, annulla, inCorso: () => [...attivi.keys()] });
}

module.exports = { creaScaricamenti };
