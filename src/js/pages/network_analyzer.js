const TONI_LOG = {
    success: { classe: 'k-console-ok', prefisso: '[OK]' },
    error: { classe: 'k-console-err', prefisso: '[ERR]' },
    warning: { classe: 'k-console-err', prefisso: '[ATT]' },
    loading: { classe: 'k-console-sys', prefisso: '[...]' },
    info: { classe: '', prefisso: '[SYS]' }
};

const formatBytes = (bytes) => {
    if (!bytes) return '0 byte';
    const k = 1024;
    const unita = ['byte', 'KB', 'MB', 'GB'];
    const i = Math.min(unita.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${unita[i]}`;
};

const riga = (icona, etichetta, valoreId, valore, colore = '') => `
    <div class="k-row k-row--between" style="padding: var(--k-space-2) 0; border-bottom: 1px solid var(--md-outline);">
        <span class="k-row k-muted" style="--k-gap: var(--k-space-2); font-size: var(--k-font-sm);">
            <span class="material-symbols-rounded" style="font-size: 1.1rem;">${icona}</span>${etichetta}
        </span>
        <span ${valoreId ? `id="${valoreId}"` : ''} style="font-weight: 600; font-size: var(--k-font-sm); ${colore ? `color: ${colore};` : ''}">${valore}</span>
    </div>`;

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-page fade-in-up">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            <span class="k-page-icon material-symbols-rounded">troubleshoot</span>
                            <div>
                                <h1 class="k-page-title">Diagnostica P2P</h1>
                                <p class="k-page-subtitle">Analisi della rete locale, del firewall e della sincronizzazione fra i nodi.</p>
                            </div>
                        </div>
                        <div class="k-page-actions">
                            <button id="btn-fix-diag" class="k-btn k-btn--danger" style="display: none;">
                                <span class="material-symbols-rounded">build</span>Risolvi problemi
                            </button>
                            <button id="btn-run-diag" class="k-btn k-btn--primary">
                                <span class="material-symbols-rounded">play_arrow</span>Avvia analisi
                            </button>
                        </div>
                    </header>

                    <div class="k-split k-split--wide-aside" style="align-items: start;">
                        <section class="k-stack" style="--k-gap: var(--k-space-2);">
                            <div class="k-row k-row--between">
                                <h2 class="k-section-title k-row" style="--k-gap: var(--k-space-2);"><span class="material-symbols-rounded" style="color: var(--md-primary);">terminal</span>Eventi di sistema</h2>
                            </div>
                            <div id="diag-console" class="k-console" role="log" aria-live="polite" style="min-height: 22rem; max-height: 60vh;">
                                <div class="k-console-sys">In attesa dell'avvio dell'analisi...</div>
                            </div>
                        </section>

                        <aside class="k-stack">
                            <section class="k-card">
                                <div class="k-card-header" style="margin-bottom: var(--k-space-2);">
                                    <h2 class="k-card-title"><span class="material-symbols-rounded">shield_locked</span>Sicurezza e database</h2>
                                </div>
                                ${riga('encrypted', 'Cifratura dati', '', 'AES-256-GCM attiva', 'var(--md-success)')}
                                ${riga('storage', 'Dimensione archivi', 'db-size', 'Calcolo...')}
                                ${riga('backup', 'Copie di sicurezza', 'db-backups', 'Calcolo...')}
                            </section>
                            <section class="k-card">
                                <div class="k-card-header">
                                    <h2 class="k-card-title"><span class="material-symbols-rounded">security</span>Firewall di Windows</h2>
                                </div>
                                <div class="k-stack" style="--k-gap: var(--k-space-2);">
                                    <button id="btn-firewall-open" class="k-btn k-btn--block">
                                        <span class="material-symbols-rounded">open_in_new</span>Apri impostazioni di Windows
                                    </button>
                                    <button id="btn-firewall-force" class="k-btn k-btn--danger-ghost k-btn--block">
                                        <span class="material-symbols-rounded">admin_panel_settings</span>Forza regole (richiede amministratore)
                                    </button>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            `;

            const btnRun = el.querySelector('#btn-run-diag');
            const btnFix = el.querySelector('#btn-fix-diag');
            const consoleEl = el.querySelector('#diag-console');

            const appendLog = (msg, type = 'info') => {
                const tono = TONI_LOG[type] || TONI_LOG.info;
                const linea = document.createElement('div');
                const ora = document.createElement('span');
                ora.className = 'k-console-sys';
                ora.textContent = new Date().toLocaleTimeString('it-IT') + ' ';
                const testo = document.createElement('span');
                if (tono.classe) testo.className = tono.classe;
                testo.textContent = `${tono.prefisso} ${msg}`;
                linea.append(ora, testo);
                consoleEl.appendChild(linea);
                consoleEl.scrollTop = consoleEl.scrollHeight;
            };

            window.electronAPI.onDiagProgress((data) => {
                appendLog(data.msg, data.status);
                if (data.data && data.data.showFixBtn) btnFix.style.display = 'inline-flex';
                if (data.data && data.data.fixCompleted) btnFix.style.display = 'none';
            });

            btnRun.addEventListener('click', async () => {
                btnFix.style.display = 'none';
                consoleEl.textContent = '';
                appendLog('Avvio della routine di diagnostica...', 'info');
                btnRun.setAttribute('aria-busy', 'true');
                await window.electronAPI.runDiagnostics();
                btnRun.removeAttribute('aria-busy');
                btnRun.innerHTML = '<span class="material-symbols-rounded">replay</span>Nuova analisi';
            });

            btnFix.addEventListener('click', async () => {
                btnFix.setAttribute('aria-busy', 'true');
                await window.electronAPI.fixDiagnostics();
                btnFix.removeAttribute('aria-busy');
            });

            el.querySelector('#btn-firewall-open').addEventListener('click', async () => {
                await window.electronAPI.openFirewallSettings();
            });

            const btnFwForce = el.querySelector('#btn-firewall-force');
            const etichettaForza = btnFwForce.innerHTML;
            btnFwForce.addEventListener('click', async () => {
                btnFwForce.setAttribute('aria-busy', 'true');
                const res = await window.electronAPI.forceFirewallRules();
                btnFwForce.removeAttribute('aria-busy');
                btnFwForce.innerHTML = res
                    ? '<span class="material-symbols-rounded">check_circle</span>Regole applicate'
                    : '<span class="material-symbols-rounded">error</span>Non riuscito: autorizzazione negata?';
                setTimeout(() => { btnFwForce.innerHTML = etichettaForza; }, 3000);
            });

            const loadBackupStatus = async () => {
                try {
                    const status = await window.electronAPI.dbGetBackupStatus();
                    if (!status) return;
                    const sizeEl = el.querySelector('#db-size');
                    const backupsEl = el.querySelector('#db-backups');
                    const mainSize = (status.primary && (status.primary.appData || status.primary.docs)) || 0;
                    sizeEl.textContent = mainSize ? formatBytes(mainSize) : 'Non inizializzato';
                    const totale = Number(status.totalBackups) || 0;
                    backupsEl.textContent = totale > 0 ? `${totale} archivi cifrati` : 'Nessuna, in attesa';
                    backupsEl.style.color = totale > 0 ? 'var(--md-success)' : 'var(--md-warning)';
                } catch (e) {
                    console.error('[Diagnostica] Stato dei backup non disponibile:', e);
                }
            };

            loadBackupStatus();
            const pollTimer = setInterval(() => {
                if (!el.querySelector('#db-size')) {
                    clearInterval(pollTimer);
                    return;
                }
                loadBackupStatus();
            }, 3000);
        } catch (e) {
            console.error(e);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore di caricamento della Diagnostica P2P.</div></div>';
        }
    }
};
