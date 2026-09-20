import { Router, toast } from '../../../../js/utils.js';
import { confermaInLinea, pannelloInLinea } from '../../../../js/shared/conferma_inline.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const statoCentrato = ({ icona, tono, titolo, testo, pulsanti }) => `
    <div class="k-page k-page--narrow fade-in-up" style="justify-content: center; min-height: 100%;">
        <div class="k-card k-empty">
            <span class="material-symbols-rounded" style="color: var(--md-${tono}); background: var(--md-${tono}-container);">${icona}</span>
            <div class="k-empty-title">${titolo}</div>
            <div class="k-empty-text">${testo}</div>
            <div class="k-row" style="justify-content: center; margin-top: var(--k-space-2);">${pulsanti}</div>
        </div>
    </div>`;

export default {
    render: async (el) => {
        try {
            const currentUserId = sessionStorage.getItem('currentUserId');
            if (!currentUserId) throw new Error("Sessione scaduta o non valida. Effettua di nuovo l'accesso.");
            const resUsers = await window.electronAPI.usersGetAll({});
            const utenti = Array.isArray(resUsers) ? resUsers : [];
            const currentUser = utenti.find(u => u.id === currentUserId);
            if (!currentUser || !currentUser.is_superadmin) {
                el.innerHTML = statoCentrato({
                    icona: 'lock',
                    tono: 'error',
                    titolo: 'Accesso riservato',
                    testo: 'Questa sezione contiene log critici della rete ed è riservata ai super amministratori.',
                    pulsanti: '<button class="k-btn k-btn--primary" data-azione="indietro"><span class="material-symbols-rounded">arrow_back</span>Torna indietro</button>'
                });
                el.querySelector('[data-azione="indietro"]').addEventListener('click', () => Router.back());
                return;
            }

            el.innerHTML = `
                <div class="k-page fade-in-up">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            <span class="k-page-icon material-symbols-rounded" style="background: var(--md-error-container); color: var(--md-error);">sync_problem</span>
                            <div>
                                <h1 class="k-page-title">Errori di sincronizzazione</h1>
                                <p class="k-page-subtitle">Errori segnalati dai nodi della rete durante la replica dei dati.</p>
                            </div>
                        </div>
                        <div class="k-page-actions">
                            <button id="refresh-logs-btn" class="k-btn">
                                <span class="material-symbols-rounded">refresh</span>Aggiorna
                            </button>
                            <button id="clear-logs-btn" class="k-btn k-btn--danger-ghost">
                                <span class="material-symbols-rounded">delete_sweep</span>Svuota tutti
                            </button>
                        </div>
                    </header>
                    <div id="logs-content"></div>
                </div>
            `;

            const container = el.querySelector('#logs-content');
            let metadati = [];

            const loadLogs = async () => {
                container.innerHTML = '<div class="k-card k-loading"><div class="k-spinner"></div><span>Caricamento dei log...</span></div>';
                try {
                    const res = await window.electronAPI.rbac.getDistributedLogs();
                    if (!res || !res.success) {
                        container.innerHTML = `<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Caricamento non riuscito: ${esc(res?.error || 'errore sconosciuto')}</div></div>`;
                        return;
                    }
                    const logs = Array.isArray(res.logs) ? res.logs : [];
                    if (logs.length === 0) {
                        container.innerHTML = `
                            <div class="k-card k-empty">
                                <span class="material-symbols-rounded" style="color: var(--md-success); background: var(--md-success-container);">check_circle</span>
                                <div class="k-empty-title">Nessun errore nella rete</div>
                                <p class="k-empty-text">Tutti i nodi risultano sincronizzati.</p>
                            </div>`;
                        return;
                    }
                    metadati = logs.map(log => {
                        if (!log.meta) return null;
                        try {
                            const meta = JSON.parse(log.meta);
                            return Object.keys(meta).length > 0 ? meta : null;
                        } catch (e) {
                            return { meta: log.meta };
                        }
                    });
                    container.innerHTML = `
                        <div class="k-table-wrap" style="max-height: 70vh;">
                            <table class="k-table">
                                <thead><tr><th>Data e ora</th><th>Nodo</th><th>Livello</th><th>Messaggio</th><th class="k-table-actions"><span class="k-sr-only">Azioni</span></th></tr></thead>
                                <tbody>
                                    ${logs.map((log, indice) => {
                                        const meta = metadati[indice] || {};
                                        const grave = log.level === 'ERROR' || log.level === 'FATAL';
                                        const nodo = meta.node_name || log.node_name || (log.node_id ? String(log.node_id).substring(0, 8) : 'Sconosciuto');
                                        return `
                                            <tr>
                                                <td class="k-muted" style="white-space: nowrap; font-variant-numeric: tabular-nums;">${esc(new Date(log.created_at * 1000).toLocaleString('it-IT'))}</td>
                                                <td style="font-weight: 600;">${esc(nodo)}</td>
                                                <td><span class="k-badge k-badge--${grave ? 'danger' : 'warning'}">${esc(log.level)}</span></td>
                                                <td style="max-width: 28rem; overflow-wrap: anywhere;">
                                                    <div>${esc(log.message)}</div>
                                                    ${metadati[indice] ? `<button class="k-btn k-btn--ghost k-btn--sm" data-dettagli="${indice}" style="margin-top: var(--k-space-1); padding-left: 0;"><span class="material-symbols-rounded">code</span>Dettagli tecnici</button>` : ''}
                                                </td>
                                                <td class="k-table-actions">
                                                    <button class="k-btn k-btn--sm" data-risolvi="${esc(log.id)}"><span class="material-symbols-rounded">done</span>Risolto</button>
                                                </td>
                                            </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>`;
                } catch (err) {
                    container.innerHTML = `<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>${esc(err.message)}</div></div>`;
                }
            };

            container.addEventListener('click', async (e) => {
                const dettagli = e.target.closest('[data-dettagli]');
                if (dettagli) return pannelloInLinea(dettagli, { titolo: 'Dettagli tecnici', testo: JSON.stringify(metadati[Number(dettagli.dataset.dettagli)], null, 2) });
                const risolvi = e.target.closest('[data-risolvi]');
                if (!risolvi) return;
                risolvi.setAttribute('aria-busy', 'true');
                try {
                    const delRes = await window.electronAPI.rbac.deleteDistributedLog(risolvi.dataset.risolvi);
                    if (delRes && delRes.success) {
                        toast('Errore segnato come risolto', 'success');
                        loadLogs();
                    } else {
                        risolvi.removeAttribute('aria-busy');
                        toast('Operazione non riuscita', 'error');
                    }
                } catch (err) {
                    risolvi.removeAttribute('aria-busy');
                    toast('Errore: ' + err.message, 'error');
                }
            });

            el.querySelector('#refresh-logs-btn').addEventListener('click', loadLogs);
            el.querySelector('#clear-logs-btn').addEventListener('click', async (evento) => {
                const ok = await confermaInLinea(evento.currentTarget, {
                    testo: 'Svuotare i log di errore? Verranno eliminati tutti i log di errore di questa rete.',
                    etichetta: 'Svuota tutti'
                });
                if (!ok) return;
                const btn = el.querySelector('#clear-logs-btn');
                btn.setAttribute('aria-busy', 'true');
                try {
                    const res = await window.electronAPI.rbac.clearDistributedLogs();
                    if (res && res.success) {
                        toast('Log svuotati', 'success');
                        await loadLogs();
                    } else {
                        toast('Pulizia dei log non riuscita', 'error');
                    }
                } catch (err) {
                    toast('Errore: ' + err.message, 'error');
                } finally {
                    btn.removeAttribute('aria-busy');
                }
            });

            await loadLogs();
        } catch (e) {
            el.innerHTML = statoCentrato({
                icona: 'running_with_errors',
                tono: 'error',
                titolo: 'Modulo non avviato',
                testo: `Il modulo degli errori di sincronizzazione non è riuscito ad avviarsi.<br><code class="k-mono">${esc(e.message)}</code>`,
                pulsanti: `
                    <button class="k-btn" data-azione="ricarica"><span class="material-symbols-rounded">refresh</span>Riprova</button>
                    <button class="k-btn k-btn--primary" data-azione="indietro"><span class="material-symbols-rounded">arrow_back</span>Indietro</button>`
            });
            el.querySelector('[data-azione="indietro"]')?.addEventListener('click', () => Router.back());
            el.querySelector('[data-azione="ricarica"]')?.addEventListener('click', () => window.location.reload());
        }
    }
};
