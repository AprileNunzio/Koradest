import { esc, opzioni, interruttore, scheda, campo } from '../comune/ui.js';

const STATI = [
    { valore: 'attivo', etichetta: 'Attivo: il pulsante di Jarvis è sempre disponibile' },
    { valore: 'disattivo', etichetta: 'Disattivo: nessun assistente e nessuna richiesta al modello' },
    { valore: 'da_chiedere', etichetta: 'Chiedi al prossimo accesso di un amministratore' }
];

export function montaJarvis(contenitore, contesto) {
    const { configurazione, configurazioneOllama } = contesto;
    const divJarvis = document.createElement('div');
    divJarvis.innerHTML = scheda('smart_toy', 'Jarvis', 'Se l\'assistente è disponibile, come si presenta e cosa vede.', `
        <div class="k-form-grid">
            ${campo('ai-jarvis', 'Stato dell\'assistente', `<select id="ai-jarvis" class="k-select">${opzioni(STATI, configurazione.jarvis)}</select>`, '', true)}
            ${interruttore('ai-contesto-pagina', 'Invia al modello il contenuto della pagina aperta', configurazione.inviaContestoPagina, 'Aiuta Jarvis a capire di cosa parli. Disattivalo se sullo schermo ci sono dati che non vuoi mandare al modello.')}
            ${interruttore('ai-ascolto-continuo', 'Ascolto continuo (Wake Word)', configurazione.ascoltoContinuo, 'Jarvis rimarrà sempre in ascolto per la wake word ("Jarvis" o "Ehi Jarvis").')}
            ${campo('jarvis-personalita', 'Personalità e istruzioni', `<textarea id="jarvis-personalita" class="k-input" rows="4" maxlength="4000">${esc(configurazioneOllama.systemPrompt || '')}</textarea>`, 'Il tono e le regole di Jarvis. Le istruzioni operative (data, uso degli strumenti) le aggiunge sempre KORADEST.', true)}
            ${interruttore('jarvis-voce', 'Leggi le risposte ad alta voce', Boolean(configurazioneOllama.voiceEnabled))}
            ${campo('jarvis-velocita', 'Velocità della voce', `<input type="range" id="jarvis-velocita" min="0.7" max="1.4" step="0.05" value="${esc(configurazioneOllama.voiceRate || 1)}" style="width: 100%;">`, '')}
        </div>`);
    
    contenitore.innerHTML = '';
    contenitore.appendChild(divJarvis);

    const leggi = selettore => contenitore.querySelector(selettore);
    return {
        valori: () => ({
            ai: { 
                jarvis: leggi('#ai-jarvis').value, 
                inviaContestoPagina: leggi('#ai-contesto-pagina').checked,
                ascoltoContinuo: leggi('#ai-ascolto-continuo').checked
            },
            ollama: {
                systemPrompt: leggi('#jarvis-personalita').value.trim(),
                voiceEnabled: leggi('#jarvis-voce').checked,
                voiceRate: Number(leggi('#jarvis-velocita').value)
            }
        })
    };
}
