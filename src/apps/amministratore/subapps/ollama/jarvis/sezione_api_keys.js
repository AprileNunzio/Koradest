import { esc, scheda, campo, interruttore } from '../comune/ui.js';
import { toast } from '../../../../../js/utils.js';

export function montaApiKeys(contenitore, { api, ollama, configurazione }) {
    contenitore.innerHTML = scheda('key', 'Chiavi API', 'Imposta le chiavi per i modelli esterni.', `
        <div class="k-form-grid" id="api-keys-container">
            ${campo('chiave-gemini', 'Google Gemini API Key', `<div class="k-input-group"><input type="password" id="chiave-gemini" class="k-input" placeholder="${configurazione.chiavi?.gemini?.salvata ? 'Salvata...' : 'Inserisci chiave...'}"><button class="k-btn" id="salva-gemini">Salva</button></div>`, '', true)}
            ${campo('chiave-claude', 'Anthropic Claude API Key', `<div class="k-input-group"><input type="password" id="chiave-claude" class="k-input" placeholder="${configurazione.chiavi?.claude?.salvata ? 'Salvata...' : 'Inserisci chiave...'}"><button class="k-btn" id="salva-claude">Salva</button></div>`, '', true)}
            ${campo('chiave-openai', 'OpenAI API Key', `<div class="k-input-group"><input type="password" id="chiave-openai" class="k-input" placeholder="${configurazione.chiavi?.openai?.salvata ? 'Salvata...' : 'Inserisci chiave...'}"><button class="k-btn" id="salva-openai">Salva</button></div>`, '', true)}
        </div>`);

    const collega = (nomeFornitore, idInput, idSalva) => {
        const input = contenitore.querySelector(idInput);
        const salva = contenitore.querySelector(idSalva);
        salva.addEventListener('click', async () => {
            try {
                const chiave = input.value.trim();
                if (!chiave) {
                    toast('Inserisci una chiave valida prima di salvare.', 'warning');
                    return;
                }
                const btnOriginal = salva.textContent;
                salva.textContent = 'Salvataggio...';
                salva.disabled = true;
                const esito = await ollama.salvaChiave(nomeFornitore, chiave);
                if (esito?.success || esito === true || (esito && esito.error === undefined)) {
                    toast(`Chiave per ${nomeFornitore} salvata con successo.`, 'success');
                    input.value = '';
                    input.placeholder = 'Salvata...';
                } else {
                    throw new Error(esito?.error || 'Errore sconosciuto');
                }
            } catch (errore) {
                toast(`Errore nel salvataggio della chiave: ${errore.message}`, 'error');
            } finally {
                salva.textContent = 'Salva';
                salva.disabled = false;
            }
        });
    };

    collega('gemini', '#chiave-gemini', '#salva-gemini');
    collega('claude', '#chiave-claude', '#salva-claude');
    collega('openai', '#chiave-openai', '#salva-openai');
}
