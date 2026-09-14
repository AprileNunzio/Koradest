// Canale fra l'app isolata e KORADEST. L'app non vede electronAPI: ogni richiesta
// viaggia con postMessage verso la finestra del core, che la esegue per conto dell'app.

const CANALE = 'koradest';
const inAttesa = new Map();
const ascoltatori = new Map();
let progressivo = 0;

export const dentroKoradest = () => window.parent !== window;

window.addEventListener('message', (evento) => {
    if (!dentroKoradest() || evento.source !== window.parent) return;
    const messaggio = evento.data;
    if (!messaggio || messaggio.canale !== CANALE) return;

    if (typeof messaggio.evento === 'string') {
        (ascoltatori.get(messaggio.evento) || []).forEach((funzione) => {
            try {
                funzione(messaggio.dati);
            } catch (errore) {
                console.error(`[KORADEST] Errore nell'ascoltatore "${messaggio.evento}":`, errore);
            }
        });
        return;
    }

    const attesa = inAttesa.get(messaggio.id);
    if (!attesa) return;
    inAttesa.delete(messaggio.id);
    clearTimeout(attesa.timer);
    if (messaggio.esito) attesa.risolvi(messaggio.dati);
    else attesa.rifiuta(new Error(messaggio.errore || 'Operazione non riuscita'));
});

export function richiesta(metodo, parametri = {}, { scadenzaMs = 0 } = {}) {
    return new Promise((risolvi, rifiuta) => {
        if (!dentroKoradest()) {
            rifiuta(new Error('Questa applicazione funziona solo dentro KORADEST'));
            return;
        }
        const id = `r${Date.now().toString(36)}${(progressivo++).toString(36)}`;
        const timer = scadenzaMs > 0
            ? setTimeout(() => {
                inAttesa.delete(id);
                rifiuta(new Error(`KORADEST non ha risposto a "${metodo}"`));
            }, scadenzaMs)
            : null;
        inAttesa.set(id, { risolvi, rifiuta, timer });
        window.parent.postMessage({ canale: CANALE, id, metodo, parametri }, '*');
    });
}

export function su(evento, funzione) {
    const elenco = ascoltatori.get(evento) || [];
    elenco.push(funzione);
    ascoltatori.set(evento, elenco);
    return () => ascoltatori.set(evento, (ascoltatori.get(evento) || []).filter(f => f !== funzione));
}
