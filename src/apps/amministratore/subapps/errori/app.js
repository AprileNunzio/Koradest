import { toast, conferma } from '../../../../js/utils.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-page fade-in-up">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            <span class="k-page-icon material-symbols-rounded">bug_report</span>
                            <div>
                                <h1 class="k-page-title">Errori e log</h1>
                                <p class="k-page-subtitle">Installazioni, aggiornamenti e anomalie delle applicazioni su questo nodo.</p>
                            </div>
                        </div>
                        <div class="k-page-actions">
                            <button id="btn-refresh" class="k-btn">
                                <span class="material-symbols-rounded">refresh</span>Aggiorna
                            </button>
                            <button id="btn-clear-all" class="k-btn k-btn--danger-ghost">
                                <span class="material-symbols-rounded">delete_sweep</span>Svuota registro
                            </button>
                        </div>
                    </header>
                    <div id="logs-content"></div>
                </div>
            `;

            const content = el.querySelector('#logs-content');

            const renderLogs = (logs) => {
                if (!Array.isArray(logs) || logs.length === 0) {
                    content.innerHTML = `
                        <div class="k-card k-empty">
                            <span class="material-symbols-rounded" style="color: var(--md-success); background: var(--md-success-container);">task_alt</span>
                            <div class="k-empty-title">Registro vuoto</div>
                            <p class="k-empty-text">Nessun errore o operazione registrata sulle applicazioni.</p>
                        </div>`;
                    return;
                }
                content.innerHTML = `
                    <div class="k-table-wrap" style="max-height: 70vh;">
                        <table class="k-table">
                            <thead>
                                <tr>
                                    <th>Data e ora</th>
                                    <th>Applicazione</th>
                                    <th>Azione</th>
                                    <th>Esito</th>
                                    <th>Dettagli</th>
                                    <th class="k-table-actions"><span class="k-sr-only">Azioni</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.map(log => {
                                    const errore = log.success === 0;
                                    return `
                                        <tr>
                                            <td class="k-muted" style="white-space: nowrap; font-variant-numeric: tabular-nums;">${esc(new Date(Number(log.timestamp) * (Number(log.timestamp) < 1e11 ? 1000 : 1)).toLocaleString('it-IT'))}</td>
                                            <td style="font-weight: 600;">${esc(log.app_id)}</td>
                                            <td>${esc(log.action || '—')}</td>
                                            <td><span class="k-badge k-badge--${errore ? 'danger' : 'success'}">${errore ? 'Errore' : 'Completato'}</span></td>
                                            <td class="k-muted" style="max-width: 24rem; overflow-wrap: anywhere; font-size: var(--k-font-sm);">${esc(log.error || '—')}</td>
                                            <td class="k-table-actions">
                                                <button class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-elimina="${esc(log.id)}" aria-label="Elimina voce" title="Elimina voce">
                                                    <span class="material-symbols-rounded">delete</span>
                                                </button>
                                            </td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>`;
            };

            const loadLogs = async () => {
                content.innerHTML = '<div class="k-card k-loading"><div class="k-spinner"></div><span>Caricamento del registro...</span></div>';
                try {
                    renderLogs(await window.electronAPI.getSystemLogs());
                } catch (e) {
                    console.error('[Errori] Caricamento non riuscito:', e);
                    content.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Impossibile leggere il registro dal database.</div></div>';
                }
            };

            content.addEventListener('click', async (e) => {
                const pulsante = e.target.closest('[data-elimina]');
                if (!pulsante) return;
                if (!(await conferma({ titolo: 'Eliminare questa voce?', etichetta: 'Elimina', pericolosa: true }))) return;
                try {
                    const res = await window.electronAPI.deleteSystemLog(parseInt(pulsante.dataset.elimina, 10));
                    if (res && res.success) {
                        toast('Voce eliminata', 'success');
                        loadLogs();
                    } else {
                        toast('Eliminazione non riuscita: ' + (res?.error || 'errore sconosciuto'), 'error');
                    }
                } catch (err) {
                    toast('Errore: ' + err.message, 'error');
                }
            });

            el.querySelector('#btn-refresh').addEventListener('click', loadLogs);
            el.querySelector('#btn-clear-all').addEventListener('click', async () => {
                const ok = await conferma({
                    titolo: 'Svuotare il registro?',
                    testo: 'Tutti gli errori e i log di sistema verranno eliminati definitivamente.',
                    etichetta: 'Svuota registro',
                    pericolosa: true
                });
                if (!ok) return;
                try {
                    const res = await window.electronAPI.clearSystemLogs();
                    if (res && res.success) {
                        toast('Registro svuotato', 'success');
                        loadLogs();
                    } else {
                        toast('Svuotamento non riuscito: ' + (res?.error || 'errore sconosciuto'), 'error');
                    }
                } catch (err) {
                    toast('Errore: ' + err.message, 'error');
                }
            });

            loadLogs();
        } catch (error) {
            console.error('[Errori] Pagina non caricata:', error);
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore di caricamento della pagina Errori e log.</div></div>';
        }
    }
};
