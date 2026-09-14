import { toast } from '../../../../js/utils.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const conferma = ({ titolo, testo, etichetta, pericolosa = true }) => new Promise((resolve) => {
    const sfondo = document.createElement('div');
    sfondo.className = 'k-dialog-backdrop';
    sfondo.innerHTML = `
        <div class="k-dialog" role="alertdialog" aria-modal="true" aria-labelledby="db-conferma-titolo">
            <div class="k-dialog-header">
                <span class="k-page-icon material-symbols-rounded" style="${pericolosa ? 'background: var(--md-error-container); color: var(--md-error);' : ''}">${pericolosa ? 'warning' : 'help'}</span>
                <h2 id="db-conferma-titolo" class="k-dialog-title">${esc(titolo)}</h2>
            </div>
            <div class="k-dialog-body"><p>${esc(testo)}</p></div>
            <div class="k-dialog-footer">
                <button class="k-btn k-btn--ghost" data-esito="no">Annulla</button>
                <button class="k-btn ${pericolosa ? 'k-btn--danger' : 'k-btn--primary'}" data-esito="si">${esc(etichetta)}</button>
            </div>
        </div>`;
    const chiudi = (esito) => {
        sfondo.remove();
        resolve(esito);
    };
    sfondo.addEventListener('click', (e) => {
        if (e.target === sfondo) return chiudi(false);
        const pulsante = e.target.closest('[data-esito]');
        if (pulsante) chiudi(pulsante.dataset.esito === 'si');
    });
    document.body.appendChild(sfondo);
    sfondo.querySelector('[data-esito="no"]').focus();
});

const AZIONI = {
    soft_sync: null,
    hard_clone_from_remote: {
        titolo: 'Clonare il database da questo nodo?',
        testo: 'Il database locale verrà sostituito con quello del nodo remoto. I dati non ancora sincronizzati restano solo nella cartella dei backup.',
        etichetta: 'Clona da nodo'
    },
    hard_clone_to_remote: {
        titolo: 'Sovrascrivere il nodo remoto?',
        testo: 'Il nodo remoto verrà formattato e riceverà il tuo database. I suoi dati non sincronizzati restano solo nella sua cartella dei backup.',
        etichetta: 'Sovrascrivi nodo'
    }
};

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-page fade-in-up">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            <span class="k-page-icon material-symbols-rounded">dns</span>
                            <div>
                                <h1 class="k-page-title">Database di rete</h1>
                                <p class="k-page-subtitle">Monitoraggio e riparazione della sincronizzazione P2P fra i nodi.</p>
                            </div>
                        </div>
                    </header>

                    <div class="k-split k-split--wide-aside" style="align-items: start;">
                        <section class="k-section" style="order: 2;">
                            <div class="k-section-header">
                                <h2 class="k-section-title">Nodi connessi</h2>
                                <span class="k-badge k-badge--primary"><span class="material-symbols-rounded spin">sync</span>In tempo reale</span>
                            </div>
                            <div id="nodes-container" class="k-stack" style="--k-gap: var(--k-space-3);">
                                <div class="k-card k-loading"><div class="k-spinner"></div><span>Caricamento nodi...</span></div>
                            </div>
                        </section>

                        <aside class="k-stack" style="order: 1;">
                            <div class="k-stat">
                                <span class="k-stat-icon material-symbols-rounded">computer</span>
                                <div style="flex: 1; min-width: 0;">
                                    <div class="k-stat-label">Blocchi nel registro locale</div>
                                    <div class="k-stat-value" id="local-blocks">--</div>
                                </div>
                                <span class="k-badge k-badge--success"><span class="k-dot"></span>Attivo</span>
                            </div>
                            <section class="k-card k-card--danger">
                                <div class="k-card-header" style="margin-bottom: var(--k-space-2);">
                                    <h2 class="k-card-title"><span class="material-symbols-rounded">warning</span>Allineamento forzato</h2>
                                </div>
                                <p class="k-muted" style="font-size: var(--k-font-sm); margin-bottom: var(--k-space-4);">
                                    Invia un impulso a tutti i PC della LAN: si riavvieranno e cloneranno questo database.
                                </p>
                                <button id="btn-nuke" class="k-btn k-btn--danger k-btn--block">
                                    <span class="material-symbols-rounded">sync_problem</span>Allinea tutti i nodi
                                </button>
                            </section>
                        </aside>
                    </div>
                </div>
            `;

            let pollTimer = null;
            const nodesContainer = el.querySelector('#nodes-container');
            const localBlocksEl = el.querySelector('#local-blocks');

            el.querySelector('#btn-nuke').addEventListener('click', async () => {
                const ok = await conferma({
                    titolo: 'Allineare tutti i nodi?',
                    testo: 'Stai per sovrascrivere i dati di tutti gli altri nodi della rete. I dati non ancora sincronizzati sui nodi remoti restano solo nelle loro cartelle dei backup.',
                    etichetta: 'Procedi'
                });
                if (!ok) return;
                const btn = el.querySelector('#btn-nuke');
                btn.setAttribute('aria-busy', 'true');
                try {
                    const res = await window.electronAPI.forceNetworkDatabaseSync();
                    if (res && res.success) toast('Impulso di allineamento inviato', 'success');
                    else toast('Errore: ' + (res?.error || 'sconosciuto'), 'error');
                } catch (e) {
                    toast('Errore: ' + e.message, 'error');
                } finally {
                    btn.removeAttribute('aria-busy');
                }
            });

            const renderNodes = (localBlocks, nodes) => {
                if (!nodes || nodes.length === 0) {
                    nodesContainer.innerHTML = `
                        <div class="k-card k-empty">
                            <span class="material-symbols-rounded">lan</span>
                            <div class="k-empty-title">Nessun nodo connesso</div>
                            <p class="k-empty-text">Gli altri PC della rete compariranno qui appena raggiungibili.</p>
                        </div>`;
                    return;
                }
                nodesContainer.innerHTML = nodes.map(n => {
                    const pct = Math.max(0, Math.min(100, Number(n.syncPercentage) || 0));
                    const tono = pct >= 99 ? 'success' : (pct >= 80 ? 'warning' : 'error');
                    const porta = Number(n.port) || 34567;
                    return `
                        <div class="k-card" style="padding: var(--k-space-4);">
                            <div class="k-row k-row--between" style="align-items: flex-start;">
                                <div style="min-width: 0;">
                                    <div class="k-row" style="--k-gap: var(--k-space-2); font-weight: 600;">
                                        <span class="material-symbols-rounded" style="color: var(--md-${tono}); font-size: 1.1rem;">power</span>
                                        <span class="k-truncate">${esc(n.name || 'Nodo sconosciuto')}</span>
                                    </div>
                                    <div class="k-mono k-muted" style="font-size: var(--k-font-xs); margin-top: 2px;">${esc(n.ip)}:${porta}</div>
                                </div>
                                <span class="k-badge k-badge--${tono === 'error' ? 'danger' : tono}">${pct}%</span>
                            </div>
                            <div style="margin: var(--k-space-3) 0;">
                                <div class="k-row k-row--between k-muted" style="font-size: var(--k-font-xs); margin-bottom: var(--k-space-1);">
                                    <span>Blocchi <b>${esc(n.remoteBlocks)}</b> di ${esc(localBlocks)}</span>
                                </div>
                                <div class="k-progress" style="--k-progress-color: var(--md-${tono});"><span style="width: ${pct}%;"></span></div>
                            </div>
                            <div class="k-row k-row--end" style="--k-gap: var(--k-space-2);">
                                <button class="k-btn k-btn--sm" data-azione="soft_sync" data-ip="${esc(n.ip)}" data-porta="${porta}" title="Richiede i pacchetti mancanti senza distruggere dati">
                                    <span class="material-symbols-rounded">download</span>Sincronizza
                                </button>
                                <button class="k-btn k-btn--sm k-btn--danger-ghost" data-azione="hard_clone_from_remote" data-ip="${esc(n.ip)}" data-porta="${porta}" title="Clona il database dal nodo">
                                    <span class="material-symbols-rounded">file_download</span>Da nodo
                                </button>
                                <button class="k-btn k-btn--sm k-btn--danger-ghost" data-azione="hard_clone_to_remote" data-ip="${esc(n.ip)}" data-porta="${porta}" title="Sovrascrive il nodo con il tuo database">
                                    <span class="material-symbols-rounded">publish</span>Su nodo
                                </button>
                            </div>
                        </div>`;
                }).join('');
            };

            const poll = async () => {
                if (!document.body.contains(el)) { clearInterval(pollTimer); return; }
                try {
                    const data = await window.electronAPI.getNetworkSyncStatus();
                    if (data) {
                        localBlocksEl.textContent = data.localBlocks || 0;
                        renderNodes(data.localBlocks || 0, data.nodes || []);
                    }
                } catch (e) {
                    console.error('[Database] Aggiornamento stato non riuscito', e);
                }
            };

            nodesContainer.addEventListener('click', async (e) => {
                const pulsante = e.target.closest('[data-azione]');
                if (!pulsante) return;
                const azione = pulsante.dataset.azione;
                const avviso = AZIONI[azione];
                if (avviso && !(await conferma(avviso))) return;
                toast('Invio del comando in corso...', 'info');
                try {
                    const res = await window.electronAPI.executeNodeAction(azione, pulsante.dataset.ip, Number(pulsante.dataset.porta));
                    if (res && res.success) toast('Comando eseguito', 'success');
                    else toast('Errore: ' + (res?.error || 'comando non riuscito'), 'error');
                } catch (err) {
                    toast('Errore: ' + err.message, 'error');
                }
                poll();
            });

            poll();
            pollTimer = setInterval(poll, 3000);
        } catch (e) {
            console.error(e);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore di caricamento del modulo Database.</div></div>';
        }
    }
};
