import { scheda } from '../comune/ui.js';

export function montaProva(contenitore, { ollama }) {
    contenitore.innerHTML = scheda('terminal', 'Prova l\'assistente', 'Una domanda di prova con le impostazioni salvate, come la farebbe Jarvis. Le operazioni richieste vengono eseguite davvero.', `
        <form class="k-stack" data-prova novalidate>
            <div class="k-input-group">
                <span class="material-symbols-rounded" aria-hidden="true">chat</span>
                <input type="text" class="k-input" data-domanda maxlength="2000" placeholder="Es. Quali bollette scadono questo mese?" aria-label="Domanda di prova">
            </div>
            <div class="k-row k-row--end"><button type="submit" class="k-btn k-btn--primary"><span class="material-symbols-rounded" aria-hidden="true">send</span>Invia</button></div>
            <div class="k-card k-card--muted" data-risposta style="white-space: pre-wrap; overflow-wrap: anywhere; min-height: 5rem;">La risposta comparirà qui.</div>
            <p class="k-hint" data-dettagli style="margin: 0;"></p>
        </form>`);

    const risposta = contenitore.querySelector('[data-risposta]');
    const dettagli = contenitore.querySelector('[data-dettagli]');
    contenitore.querySelector('[data-prova]').addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const domanda = contenitore.querySelector('[data-domanda]').value.trim();
        if (!domanda) return;
        const pulsante = evento.currentTarget.querySelector('button[type="submit"]');
        pulsante.disabled = true;
        risposta.textContent = 'Elaborazione…';
        dettagli.textContent = '';
        const inizio = performance.now();
        const esito = await ollama.chat({ prompt: domanda });
        pulsante.disabled = false;
        risposta.textContent = esito && esito.success ? esito.content : `Errore: ${(esito && esito.error) || 'nessuna risposta'}`;
        if (esito && esito.success) {
            dettagli.textContent = `${esito.fornitore} · ${esito.passi} passi · ${esito.toolCallsExecuted} strumenti eseguiti · ${Math.round(performance.now() - inizio)} ms`;
        }
    });
    return { valori: () => ({}) };
}
