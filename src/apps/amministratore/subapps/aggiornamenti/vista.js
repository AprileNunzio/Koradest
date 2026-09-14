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

const STILE_CARD = 'padding: 1.5rem; background: var(--md-surface); border-radius: 16px; border: 1px solid var(--md-surface-variant); display: flex; flex-direction: column; gap: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.03);';
const STILE_TESTA = 'display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--md-surface-variant); padding-bottom: 1rem;';
const STILE_LABEL = 'display: block; margin-bottom: 0.6rem; color: var(--md-on-surface); font-weight: 600; font-size: 0.95rem;';
const STILE_GRUPPO = 'display: flex; flex-direction: column; gap: 0.8rem; background: var(--md-surface-variant); padding: 1rem; border-radius: 12px;';
const STILE_SELECT = 'width: 100%; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--md-outline-variant); background: var(--md-surface); color: var(--md-on-surface); font-size: 0.95rem; font-weight: 500; cursor: pointer;';
const STILE_BOX_STATO = 'display: none; padding: 0.8rem 1rem; border-radius: 10px; background: var(--md-surface-variant); font-size: 0.9rem; color: var(--md-on-surface); line-height: 1.4;';
const STILE_PIEDE = 'margin-top: auto; padding-top: 1rem; border-top: 1px dashed var(--md-surface-variant); display: flex; flex-direction: column; gap: 1rem;';

export function opzioniIntervallo() {
    try {
        return INTERVALLI.map(v => `<option value="${v.ore}">${v.etichetta}</option>`).join('');
    } catch (e) {
        return '<option value="4">Ogni 4 ore</option>';
    }
}

function radio(nome, valore, id, titolo, descrizione) {
    return `
        <label style="display: flex; align-items: flex-start; gap: 0.8rem; cursor: pointer;">
            <input type="radio" name="${nome}" value="${valore}" id="${id}" style="margin-top: 0.2rem; cursor: pointer;">
            <div>
                <span style="font-weight: 600; color: var(--md-on-surface); display: block;">${titolo}</span>
                <span style="font-size: 0.85rem; color: var(--md-on-surface-variant);">${descrizione}</span>
            </div>
        </label>`;
}

function spunta(id, testo) {
    return `
        <div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.5rem 0;">
            <input type="checkbox" id="${id}" style="width: 1.3rem; height: 1.3rem; cursor: pointer;">
            <label for="${id}" style="color: var(--md-on-surface); font-size: 0.95rem; cursor: pointer; font-weight: 500;">${testo}</label>
        </div>`;
}

function cartaCore() {
    return `
        <div class="card" style="${STILE_CARD}">
            <div style="${STILE_TESTA}">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.8rem;">desktop_windows</span>
                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--md-on-surface); font-weight: 700;">Applicazione Principale (KORADEST)</h3>
                </div>
                <span id="core-version-badge" class="badge" style="background: var(--md-primary-container); color: var(--md-on-primary-container); padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">v...</span>
            </div>
            <div>
                <label class="text-label" style="${STILE_LABEL}">Modalita di Aggiornamento</label>
                <div style="${STILE_GRUPPO}">
                    ${radio('updates_core_mode', 'auto', 'core-mode-auto', 'Automatica (Consigliata)', 'Scarica automaticamente le nuove release di KORADEST tramite rete LAN P2P o repository globale e avvisa quando sono pronte.')}
                    ${radio('updates_core_mode', 'manual', 'core-mode-manual', 'Manuale', 'Segnala la presenza di una nuova release ma scarica e installa soltanto su richiesta esplicita dell amministratore.')}
                </div>
            </div>
            ${spunta('core-auto-check', 'Abilita verifica periodica in background')}
            <div>
                <label class="text-label" for="core-check-interval" style="${STILE_LABEL}">Frequenza di ricerca aggiornamenti KORADEST</label>
                <select id="core-check-interval" style="${STILE_SELECT}">${opzioniIntervallo()}</select>
            </div>
            <div style="${STILE_PIEDE}">
                <button id="btn-check-core" class="btn secondary" style="display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center;">
                    <span class="material-symbols-rounded">refresh</span> Verifica Aggiornamenti KORADEST
                </button>
                <div id="core-status-box" style="${STILE_BOX_STATO}"></div>
            </div>
        </div>`;
}

function cartaApp() {
    return `
        <div class="card" style="${STILE_CARD}">
            <div style="${STILE_TESTA}">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.8rem;">apps</span>
                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--md-on-surface); font-weight: 700;">Applicazioni &amp; Moduli Store</h3>
                </div>
                <span id="apps-count-badge" class="badge" style="background: var(--md-secondary-container); color: var(--md-on-secondary-container); padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">... App</span>
            </div>
            <div>
                <label class="text-label" style="${STILE_LABEL}">Modalita di Aggiornamento Software</label>
                <div style="${STILE_GRUPPO}">
                    ${radio('updates_apps_mode', 'auto', 'apps-mode-auto', 'Automatica (Consigliata)', 'Aggiorna automaticamente le applicazioni installate su questo nodo e notifica ad operazione ultimata.')}
                    ${radio('updates_apps_mode', 'manual', 'apps-mode-manual', 'Manuale', 'Notifica la presenza di aggiornamenti nello Store, lasciando a questo nodo la scelta di avviare l installazione.')}
                </div>
            </div>
            ${spunta('apps-auto-check', 'Abilita ricerca automatica aggiornamenti app in background')}
            <div>
                <label class="text-label" for="apps-check-interval" style="${STILE_LABEL}">Frequenza di controllo aggiornamenti Applicazioni &amp; Moduli Store</label>
                <select id="apps-check-interval" style="${STILE_SELECT}">${opzioniIntervallo()}</select>
            </div>
            <div style="${STILE_PIEDE}">
                <button id="btn-check-apps" class="btn secondary" style="display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center;">
                    <span class="material-symbols-rounded">sync</span> Verifica Aggiornamenti Store
                </button>
                <div id="apps-status-box" style="${STILE_BOX_STATO}"></div>
            </div>
        </div>`;
}

function cartaCache() {
    return `
        <div class="card" style="grid-column: 1 / -1; ${STILE_CARD}">
            <div style="${STILE_TESTA}">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.8rem;">cleaning_services</span>
                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--md-on-surface); font-weight: 700;">Gestione Cache &amp; Memoria Moduli</h3>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; align-items: center;">
                <div>
                    ${spunta('auto-clear-cache', 'Svuota e sovrascrivi la cache a ogni aggiornamento (Consigliato)')}
                    <p style="margin: 0; color: var(--md-on-surface-variant); font-size: 0.9rem; line-height: 1.5;">
                        Garantisce che nessuna versione obsoleta di script, stili o pacchetti rimanga attiva dopo un aggiornamento dell applicazione principale o dei moduli installati.
                    </p>
                </div>
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 1rem;">
                    <button id="btn-clear-cache-now" class="btn" style="background: var(--md-surface-variant); color: var(--md-on-surface); border: 1px solid var(--md-outline-variant); display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 600; cursor: pointer;">
                        <span class="material-symbols-rounded">delete_sweep</span> Svuota Cache Adesso
                    </button>
                </div>
            </div>
        </div>`;
}

export function markup() {
    return `
        <div class="fade-in-up" style="display: flex; flex-direction: column; height: 100%; padding: 1.5rem; overflow-y: auto; overflow-x: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 2rem; color: var(--md-on-surface); font-weight: 800; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.8rem;">
                        <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 2.2rem;">system_update</span>
                        Aggiornamenti &amp; Cache
                    </h2>
                    <p style="margin: 0; color: var(--md-on-surface-variant); font-size: 1.1rem;">Gestisci la modalita e la frequenza di aggiornamento di KORADEST, delle applicazioni dello Store e la pulizia della cache di memoria. Le impostazioni valgono per questo nodo.</p>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button id="btn-save-settings" class="btn primary" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 600;">
                        <span class="material-symbols-rounded">save</span> Salva Impostazioni
                    </button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                ${cartaCore()}
                ${cartaApp()}
                ${cartaCache()}
            </div>
        </div>`;
}
