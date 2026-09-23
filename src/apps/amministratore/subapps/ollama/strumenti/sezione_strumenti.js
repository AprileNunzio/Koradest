import { esc, scheda } from '../comune/ui.js';

const appDi = nome => String(nome).split('__')[0];

function raggruppa(strumenti) {
    const gruppi = new Map();
    strumenti.forEach((strumento) => {
        const app = appDi(strumento.function.name);
        gruppi.set(app, [...(gruppi.get(app) || []), strumento.function]);
    });
    return [...gruppi.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function elenco(gruppi, filtro) {
    const cerca = filtro.trim().toLowerCase();
    const visibili = gruppi
        .map(([app, strumenti]) => [app, cerca ? strumenti.filter(s => `${s.name} ${s.description}`.toLowerCase().includes(cerca)) : strumenti])
        .filter(([, strumenti]) => strumenti.length > 0);
    if (visibili.length === 0) return '<p class="k-muted" style="margin: 0;">Nessuno strumento corrisponde alla ricerca.</p>';
    return visibili.map(([app, strumenti]) => `
        <details class="k-card k-card--muted" style="padding: var(--k-space-3);" ${cerca ? 'open' : ''}>
            <summary style="cursor: pointer; display: flex; justify-content: space-between; gap: var(--k-space-2);"><strong>${esc(app)}</strong><span class="k-badge">${strumenti.length}</span></summary>
            <ul style="margin: var(--k-space-3) 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--k-space-2);">
                ${strumenti.map(s => `<li><div class="k-mono" style="font-size: var(--k-font-xs); color: var(--md-primary); overflow-wrap: anywhere;">${esc(s.name.slice(app.length + 2))}</div><div class="k-hint">${esc(s.description)}</div></li>`).join('')}
            </ul>
        </details>`).join('');
}

export async function montaStrumenti(contenitore, { ollama }) {
    const risposta = await ollama.getRegisteredTools();
    const strumenti = risposta && risposta.success ? risposta.tools : [];
    const gruppi = raggruppa(strumenti);
    contenitore.innerHTML = scheda('integration_instructions', 'Strumenti AI disponibili', `${strumenti.length} azioni da ${gruppi.length} applicazioni, pubblicate in automatico dalle app installate. A ogni domanda Jarvis ne riceve solo le più pertinenti e consulta le altre dal manuale quando servono.`, `
        <div class="k-input-group">
            <span class="material-symbols-rounded" aria-hidden="true">search</span>
            <input type="search" class="k-input" data-cerca-strumento placeholder="Cerca uno strumento" aria-label="Cerca uno strumento">
        </div>
        <div class="k-stack" style="--k-gap: var(--k-space-2); max-height: 26rem; overflow-y: auto;" data-elenco-strumenti>${elenco(gruppi, '')}</div>`);
    const destinazione = contenitore.querySelector('[data-elenco-strumenti]');
    contenitore.querySelector('[data-cerca-strumento]').addEventListener('input', (evento) => {
        destinazione.innerHTML = elenco(gruppi, evento.target.value);
    });
    return { valori: () => ({}), totale: strumenti.length };
}
