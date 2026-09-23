import { esc } from '../comune/ui.js';

const STATI_JARVIS = { attivo: 'Attivo', disattivo: 'Disattivo', da_chiedere: 'Da decidere' };

const statistica = (icona, etichetta, valore, tono = 'primary') => `
    <div class="k-card k-stat">
        <span class="k-stat-icon material-symbols-rounded" style="background: var(--md-${tono}-container); color: var(--md-${tono});" aria-hidden="true">${icona}</span>
        <div><div class="k-stat-value" style="font-size: var(--k-font-lg);">${esc(valore)}</div><div class="k-stat-label">${esc(etichetta)}</div></div>
    </div>`;

export async function montaStato(contenitore, { api, configurazione, strumenti }) {
    const disegna = (servizio) => {
        contenitore.innerHTML = `
            <div class="k-grid k-grid--sm">
                ${statistica(servizio.disponibile ? 'cloud_done' : 'cloud_off', 'Motore', servizio.disponibile ? `Online · ${servizio.latenzaMs} ms` : 'Non raggiungibile', servizio.disponibile ? 'success' : 'error')}
                ${statistica('neurology', `Modello ${configurazione.fornitore}`, configurazione.modelli[configurazione.fornitore])}
                ${statistica('smart_toy', 'Jarvis', STATI_JARVIS[configurazione.jarvis] || configurazione.jarvis, configurazione.jarvis === 'attivo' ? 'success' : 'warning')}
                ${statistica('integration_instructions', 'Strumenti AI', `${strumenti} disponibili`)}
            </div>`;
    };
    disegna({ disponibile: false, latenzaMs: -1 });
    const risposta = await api.getStatus({});
    disegna(risposta.success ? risposta.data : { disponibile: false });
}
