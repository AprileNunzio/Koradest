const INTERVALLI = [
    { ore: 1, etichetta: 'Ogni ora' },
    { ore: 2, etichetta: 'Ogni 2 ore' },
    { ore: 4, etichetta: 'Ogni 4 ore' },
    { ore: 8, etichetta: 'Ogni 8 ore' },
    { ore: 12, etichetta: 'Ogni 12 ore' },
    { ore: 24, etichetta: 'Una volta al giorno' },
    { ore: 48, etichetta: 'Ogni 2 giorni' },
    { ore: 168, etichetta: 'Una volta a settimana' }
];

export function opzioniIntervallo() {
    try {
        return INTERVALLI.map(v => `<option value="${v.ore}">${v.etichetta}</option>`).join('');
    } catch (e) {
        return '<option value="4">Ogni 4 ore</option>';
    }
}

function radio(nome, valore, id, titolo, descrizione) {
    return `
        <label class="k-choice" for="${id}">
            <input type="radio" name="${nome}" value="${valore}" id="${id}">
            <span>
                <span class="k-choice-title">${titolo}</span>
                <span class="k-choice-text">${descrizione}</span>
            </span>
        </label>`;
}

function interruttore(id, testo) {
    return `
        <label class="k-switch" for="${id}">
            <input type="checkbox" id="${id}">
            <span class="k-switch-track" aria-hidden="true"></span>
            <span>${testo}</span>
        </label>`;
}

function intestazione(icona, titolo, badgeId, badgeTesto, tono) {
    return `
        <div class="k-card-header">
            <h2 class="k-card-title"><span class="material-symbols-rounded">${icona}</span>${titolo}</h2>
            ${badgeId ? `<span id="${badgeId}" class="k-badge k-badge--${tono}">${badgeTesto}</span>` : ''}
        </div>`;
}

function cartaCore() {
    return `
        <section class="k-card">
            ${intestazione('desktop_windows', 'Applicazione principale', 'core-version-badge', 'v...', 'primary')}
            <div class="k-stack">
                <div class="k-field">
                    <span class="k-label">Modalità di aggiornamento</span>
                    <div class="k-choice-group">
                        ${radio('updates_core_mode', 'auto', 'core-mode-auto', 'Automatica (consigliata)', 'Scarica le nuove release di KORADEST dalla rete locale o dal repository e avvisa quando sono pronte.')}
                        ${radio('updates_core_mode', 'manual', 'core-mode-manual', 'Manuale', 'Segnala la nuova release, ma la scarica e installa solo su richiesta dell\'amministratore.')}
                    </div>
                </div>
                ${interruttore('core-auto-check', 'Verifica periodica in background')}
                <div class="k-field">
                    <label class="k-label" for="core-check-interval">Frequenza di controllo</label>
                    <select id="core-check-interval" class="k-select">${opzioniIntervallo()}</select>
                </div>
            </div>
            <div class="k-card-footer" style="flex-direction: column; align-items: stretch;">
                <button id="btn-check-core" class="k-btn">
                    <span class="material-symbols-rounded">refresh</span>Verifica aggiornamenti KORADEST
                </button>
                <div id="core-status-box" class="k-status-box" style="display: none;"></div>
            </div>
        </section>`;
}

function cartaApp() {
    return `
        <section class="k-card">
            ${intestazione('apps', 'Applicazioni dello Store', 'apps-count-badge', '... App', 'info')}
            <div class="k-stack">
                <div class="k-field">
                    <span class="k-label">Modalità di aggiornamento</span>
                    <div class="k-choice-group">
                        ${radio('updates_apps_mode', 'auto', 'apps-mode-auto', 'Automatica (consigliata)', 'Aggiorna da sola le applicazioni installate su questo nodo e avvisa a operazione conclusa.')}
                        ${radio('updates_apps_mode', 'manual', 'apps-mode-manual', 'Manuale', 'Segnala gli aggiornamenti nello Store e lascia a questo nodo la scelta di installarli.')}
                    </div>
                </div>
                ${interruttore('apps-auto-check', 'Ricerca automatica degli aggiornamenti in background')}
                <div class="k-field">
                    <label class="k-label" for="apps-check-interval">Frequenza di controllo</label>
                    <select id="apps-check-interval" class="k-select">${opzioniIntervallo()}</select>
                </div>
            </div>
            <div class="k-card-footer" style="flex-direction: column; align-items: stretch;">
                <button id="btn-check-apps" class="k-btn">
                    <span class="material-symbols-rounded">sync</span>Verifica aggiornamenti Store
                </button>
                <div id="apps-status-box" class="k-status-box" style="display: none;"></div>
            </div>
        </section>`;
}

function cartaCache() {
    return `
        <section class="k-card" style="grid-column: 1 / -1;">
            ${intestazione('cleaning_services', 'Cache e memoria dei moduli')}
            <div class="k-row k-row--between" style="align-items: center; --k-gap: var(--k-space-4);">
                <div class="k-stack" style="--k-gap: var(--k-space-2); flex: 1 1 22rem;">
                    ${interruttore('auto-clear-cache', 'Svuota la cache a ogni aggiornamento (consigliato)')}
                    <p class="k-hint" style="font-size: var(--k-font-sm);">Evita che script, stili o pacchetti di una versione precedente restino attivi dopo l'aggiornamento del programma o dei moduli.</p>
                </div>
                <button id="btn-clear-cache-now" class="k-btn">
                    <span class="material-symbols-rounded">delete_sweep</span>Svuota cache adesso
                </button>
            </div>
        </section>`;
}

export function markup() {
    return `
        <div class="k-page fade-in-up">
            <header class="k-page-header">
                <div class="k-page-heading">
                    <span class="k-page-icon material-symbols-rounded">system_update</span>
                    <div>
                        <h1 class="k-page-title">Aggiornamenti e cache</h1>
                        <p class="k-page-subtitle">Modalità e frequenza di aggiornamento di KORADEST e delle applicazioni, e pulizia della cache. Valgono per questo nodo.</p>
                    </div>
                </div>
                <div class="k-page-actions">
                    <button id="btn-save-settings" class="k-btn k-btn--primary">
                        <span class="material-symbols-rounded">save</span>Salva impostazioni
                    </button>
                </div>
            </header>
            <div class="k-grid k-grid--lg">
                ${cartaCore()}
                ${cartaApp()}
                ${cartaCache()}
            </div>
        </div>`;
}
