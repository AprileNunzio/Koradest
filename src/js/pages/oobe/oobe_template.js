export const OOBE_TEMPLATE = `
<div class="oobe-container">
    <div class="oobe-sidebar">
        <span class="material-symbols-rounded" style="font-size: 3.5rem; color: var(--md-primary); margin-bottom: 0.5rem;">rocket_launch</span>
        <h1 class="text-title" style="margin-bottom: 0.2rem; letter-spacing: -0.02em; font-size: 2rem;">KORADEST</h1>
        <p class="text-body" style="margin-bottom: 1.5rem; color: var(--md-on-surface-variant); font-size: 0.9rem;">Inizializza la tua postazione lavorativa. Seleziona un ruolo per continuare.</p>
        <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: auto;">
            <button id="btn-create" class="btn btn-primary" style="padding: 0.8rem 1rem; border-radius: 16px; font-weight: 600; font-size: 1rem; justify-content: flex-start; gap: 1rem;">
                <span class="material-symbols-rounded">lan</span> Crea Nuova Rete
            </button>
            <button id="btn-join" class="btn btn-secondary" style="padding: 0.8rem 1rem; border-radius: 16px; font-weight: 600; font-size: 1rem; justify-content: flex-start; gap: 1rem;">
                <span class="material-symbols-rounded">sensors</span> Unisciti a Rete Esistente
            </button>
            <div style="height: 1px; background: var(--md-outline-variant); margin: 0.5rem 0;"></div>
            <div id="unlock-container" style="display: none; flex-direction: column; gap: 0.5rem;">
                <button id="btn-unlock" class="btn btn-secondary" style="padding: 0.8rem 1rem; border-radius: 16px; font-weight: 600; font-size: 1rem; justify-content: flex-start; gap: 1rem; border: 1px solid rgba(255,160,0,0.5); color: #ffca28;">
                    <span class="material-symbols-rounded">lock_open</span> Sblocca Archivio
                </button>
                <div id="unlock-details" style="font-size: 0.75rem; color: var(--md-on-surface-variant); padding-left: 0.5rem;"></div>
            </div>
            <button id="btn-import" class="btn btn-secondary" style="padding: 0.8rem 1rem; border-radius: 16px; font-weight: 600; font-size: 1rem; justify-content: flex-start; gap: 1rem;">
                <span class="material-symbols-rounded">usb</span> Importa Backup
            </button>
            <div style="height: 1px; background: var(--md-outline-variant); margin: 0.5rem 0;"></div>
            <button id="btn-oobe-settings" class="btn btn-secondary" style="padding: 0.8rem 1rem; border-radius: 16px; font-weight: 600; font-size: 1rem; justify-content: flex-start; gap: 1rem;">
                <span class="material-symbols-rounded">settings</span> Impostazioni
            </button>
        </div>
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--md-outline-variant);">
            <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem;">
                <span class="material-symbols-rounded" style="color: var(--md-primary);">dns</span>
                <span style="font-size: 0.9rem; font-weight: 600;">Telemetria Locale</span>
            </div>
            <div style="background: var(--md-surface); border-radius: 12px; padding: 1rem; font-family: monospace; font-size: 0.85rem; color: var(--md-on-surface-variant);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><span>Status:</span> <span style="color: var(--md-primary); font-weight: bold;">OFFLINE</span></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><span>Host:</span> <span id="telemetry-host">...</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Firewall:</span> <span id="telemetry-firewall">...</span></div>
            </div>
        </div>
    </div>
    <div id="scan-area" class="oobe-main">
        <div id="initial-placeholder" style="text-align: center; opacity: 0.5;">
            <span class="material-symbols-rounded" style="font-size: 8rem; margin-bottom: 1rem;">device_hub</span>
            <h2>Seleziona un'operazione</h2>
        </div>
        <div id="join-container" style="display: none; width: 100%; max-width: 800px; height: 100%; flex-direction: column;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--md-outline-variant);">
                <h2 style="display: flex; align-items: center; gap: 0.8rem; margin: 0; font-size: 1.8rem; color: var(--md-primary);">
                    <span class="material-symbols-rounded" style="animation: spin 3s linear infinite;">radar</span> Discovery di Rete
                </h2>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div id="scan-status" style="padding: 0.5rem 1rem; background: var(--md-secondary-container); color: var(--md-on-secondary-container); border-radius: 20px; font-weight: 600; font-size: 0.9rem; transition: all 0.3s ease;">
                        Inizializzazione Scanner...
                    </div>
                    <button id="btn-rescan" class="btn btn-primary" style="border-radius: 20px; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span class="material-symbols-rounded" style="font-size: 1.2rem;">sync</span> Riavvia
                    </button>
                </div>
            </div>
            <div id="warning-container"></div>
            <div style="flex: 1; display: flex; gap: 2rem;">
                <div style="flex: 2; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; padding-right: 1rem;" id="nodes-list">
                    <div style="text-align: center; padding: 3rem 0; color: var(--md-on-surface-variant);">
                        <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 1rem;">search</span>
                        <p>Ricerca nodi in corso...</p>
                    </div>
                </div>
                <div style="flex: 1; background: var(--md-surface); border-radius: 20px; padding: 1.5rem; border: 1px solid var(--md-outline-variant); height: fit-content;">
                    <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span class="material-symbols-rounded">terminal</span> Connessione IPv4 Diretta
                    </h3>
                    <p style="font-size: 0.85rem; color: var(--md-on-surface-variant); margin-bottom: 1rem;">Se la rete è pubblica o il firewall blocca il multicast mDNS, inserisci manualmente l'IP del nodo primario.</p>
                    <label style="font-size: 0.8rem; font-weight: 600; color: var(--md-primary); margin-bottom: 0.3rem; display: block;">INDIRIZZO IP</label>
                    <input type="text" id="ip-manual-connect" class="input" placeholder="es. 192.168.1.100" autocomplete="off" style="width: 100%; border-radius: 12px; font-family: monospace; padding: 0.8rem; margin-bottom: 1.5rem; background: var(--md-surface-variant); border: none;">
                    <button id="btn-ip-manual-connect" class="btn btn-primary" style="width: 100%; border-radius: 12px; font-weight: 600; padding: 0.8rem;">
                        <span class="material-symbols-rounded">podcasts</span> Effettua Ping
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div id="network-code-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
        <div class="card fade-in-up" style="width: 100%; max-width: 450px; text-align: center; padding: 3rem 2rem; border-radius: 28px; box-shadow: 0 16px 48px rgba(0,0,0,0.3);">
            <div style="width: 80px; height: 80px; background: var(--md-secondary-container); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
                <span class="material-symbols-rounded" style="font-size: 2.5rem; color: var(--md-on-secondary-container);">lock_open</span>
            </div>
            <h2 style="margin-bottom: 0.5rem; letter-spacing: -0.02em; font-size: 1.8rem;">Autenticazione Nodo</h2>
            <p style="font-size: 0.95rem; color: var(--md-on-surface-variant); margin-bottom: 2rem;" id="modal-network-name">Connessione sicura richiesta.</p>
            <input type="text" id="modal-network-code-input" class="input" placeholder="CODICE-RETE" autocomplete="off" style="margin-bottom: 2.5rem; text-align: center; font-family: monospace; font-size: 1.5rem; font-weight: bold; text-transform: uppercase; border-radius: 16px; padding: 1.2rem; background: var(--md-surface-variant); border: 2px solid transparent; transition: border 0.3s ease;">
            <div style="display: flex; gap: 1rem;">
                <button id="btn-modal-cancel" class="btn btn-secondary" style="flex: 1; border-radius: 20px; padding: 0.8rem; font-weight: 600;">Interrompi</button>
                <button id="btn-modal-confirm" class="btn btn-primary" style="flex: 1; border-radius: 20px; padding: 0.8rem; font-weight: 600;">Sincronizza</button>
            </div>
        </div>
    </div>
    <div id="oobe-settings-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(8px);">
        <div class="card fade-in-up" style="width: 100%; max-width: 600px; padding: 2rem; border-radius: 28px; box-shadow: 0 16px 48px rgba(0,0,0,0.3); background: var(--md-surface); border: 1px solid var(--md-outline-variant); display: flex; flex-direction: column; max-height: 90vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--md-outline-variant); padding-bottom: 1rem;">
                <h2 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.8rem;">
                    <span class="material-symbols-rounded" style="color: var(--md-primary);">settings</span> Impostazioni di Sistema
                </h2>
                <button id="btn-close-settings" style="background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: var(--md-on-surface-variant); display: flex;"><span class="material-symbols-rounded">close</span></button>
            </div>
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <button class="settings-tab active" data-target="tab-diag" style="flex: 1; padding: 0.8rem; border-radius: 12px; border: none; background: var(--md-primary-container); color: var(--md-on-primary-container); font-weight: 600; cursor: pointer; transition: all 0.2s;">Diagnostica</button>
                <button class="settings-tab" data-target="tab-data" style="flex: 1; padding: 0.8rem; border-radius: 12px; border: none; background: var(--md-surface-variant); color: var(--md-on-surface-variant); font-weight: 600; cursor: pointer; transition: all 0.2s;">Gestione Dati</button>
                <button class="settings-tab" data-target="tab-troubleshoot" style="flex: 1; padding: 0.8rem; border-radius: 12px; border: none; background: var(--md-surface-variant); color: var(--md-on-surface-variant); font-weight: 600; cursor: pointer; transition: all 0.2s;">Risoluzione Problemi</button>
            </div>
            <div class="settings-content-wrapper" style="flex: 1; overflow-y: auto; padding-right: 0.5rem;">
                <div id="tab-diag" class="settings-tab-content" style="display: block;">
                    <div style="background: var(--md-surface-variant); padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; margin-bottom: 1rem; color: var(--md-on-surface);">Stato del Sistema</h3>
                        <div id="settings-diag-status" style="font-family: monospace; font-size: 0.85rem; color: var(--md-on-surface-variant); white-space: pre-wrap; margin-bottom: 1rem; background: var(--md-background); padding: 1rem; border-radius: 8px;">Caricamento stato in corso...</div>
                        <button id="btn-run-diag" class="btn btn-primary" style="width: 100%; border-radius: 12px; padding: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span class="material-symbols-rounded">health_and_safety</span> Esegui Test Diagnostico
                        </button>
                    </div>
                </div>
                <div id="tab-data" class="settings-tab-content" style="display: none;">
                    <div style="background: var(--md-surface-variant); padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; margin-bottom: 1rem; color: var(--md-on-surface);">Esportazione e Log</h3>
                        <p style="font-size: 0.9rem; color: var(--md-on-surface-variant); margin-bottom: 1rem;">Esporta i log di sistema per l'assistenza tecnica.</p>
                        <button id="btn-export-logs" class="btn btn-primary" style="width: 100%; border-radius: 12px; padding: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span class="material-symbols-rounded">file_download</span> Esporta Log di Sistema
                        </button>
                    </div>
                </div>
                <div id="tab-troubleshoot" class="settings-tab-content" style="display: none;">
                    <div style="background: rgba(255, 82, 82, 0.1); border: 1px solid var(--md-error); padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--md-error);">Ripristino Applicazione</h3>
                        <p style="font-size: 0.9rem; color: var(--md-on-surface-variant); margin-bottom: 1rem;">Se l'applicazione non si avvia correttamente o si blocca su schermate vuote, puoi formattare i file temporanei e i database. <br><b>Attenzione: questo eliminerà la configurazione locale!</b></p>
                        <button id="btn-hard-reset" class="btn" style="width: 100%; border-radius: 12px; padding: 0.8rem; font-weight: 600; background: var(--md-error); color: white; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span class="material-symbols-rounded">warning</span> Esegui Hard Reset
                        </button>
                    </div>
                    <div style="background: var(--md-surface-variant); padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; margin-bottom: 1rem; color: var(--md-on-surface);">Strumenti Sviluppatore</h3>
                        <button id="btn-check-updates" class="btn btn-secondary" style="width: 100%; border-radius: 12px; padding: 0.8rem; font-weight: 600; margin-bottom: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span class="material-symbols-rounded">update</span> Controlla Aggiornamenti
                        </button>
                        <button id="btn-toggle-devtools" class="btn btn-secondary" style="width: 100%; border-radius: 12px; padding: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span class="material-symbols-rounded">bug_report</span> Attiva DevTools
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<style>
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .node-card {
        background: var(--md-surface);
        border: 1px solid var(--md-outline-variant);
        border-radius: 16px;
        padding: 1.5rem;
        transition: all 0.2s ease;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }
    .node-card:hover {
        border-color: var(--md-primary);
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        transform: translateY(-2px);
    }
    .node-status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--md-primary);
        box-shadow: 0 0 10px var(--md-primary);
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
    }
    .oobe-container {
        width: 100%; height: 100%; display: flex; overflow: hidden; background: var(--md-background); color: var(--md-on-background); margin: 0; padding: 0;
    }
    .oobe-sidebar {
        width: 380px; background: var(--md-surface-variant); padding: 2rem; display: flex; flex-direction: column; border-right: 1px solid var(--md-outline-variant); z-index: 10;
        flex-shrink: 0; justify-content: space-between;
    }
    .oobe-main {
        flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; background: radial-gradient(circle at center, var(--md-surface-variant) 0%, var(--md-background) 100%);
        overflow-y: auto;
    }
    @media (max-width: 900px) {
        .oobe-container {
            flex-direction: column;
            overflow-y: auto;
        }
        .oobe-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--md-outline-variant);
            min-height: auto;
        }
        .oobe-main {
            min-height: 500px;
        }
        #join-container > div:last-child {
            flex-direction: column;
        }
        #join-container {
            padding-top: 2rem;
        }
    }
</style>
`;
