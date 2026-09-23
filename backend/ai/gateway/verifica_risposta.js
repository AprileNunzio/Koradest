'use strict';

const AFFERMA_SCRITTURA = /\b(ho|abbiamo|è stat[oa]|sono stat[ie])\s+(gi[aà]\s+)?(aggiunt|registrat|inserit|salvat|creat|eliminat|cancellat|rimoss|modificat|aggiornat|segnat|annotat)\w*|\b(fatto|completato|registrato|aggiunto|salvato)[.!]?\s*$/i;

function creaVerifica({ famiglia, strumentoScrive }) {
    return (testo, eseguiti) => {
        if (!famiglia) return null;
        const scritture = eseguiti.filter(voce => strumentoScrive(voce.nome));
        const riuscite = scritture.filter(voce => voce.esito === 'ok');
        if (riuscite.length > 0) return null;
        if (!AFFERMA_SCRITTURA.test(String(testo || ''))) return null;
        if (scritture.length > 0) {
            return '[VERIFICA DEL CORE] Lo strumento di scrittura ha restituito un errore, quindi l\'operazione NON è avvenuta. Correggi i parametri e riprova, oppure spiega all\'utente cosa manca.';
        }
        return '[VERIFICA DEL CORE] Non hai eseguito nessuno strumento di scrittura, quindi nulla è stato registrato. Usa lo strumento adatto adesso, oppure spiega all\'utente perché non puoi farlo.';
    };
}

module.exports = { creaVerifica, AFFERMA_SCRITTURA };
