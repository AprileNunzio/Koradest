import { toast } from '../../../utils.js';
import { esc } from '../../../shared/html.js';

function formatSize(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export async function openClusterMatrixModal() {
    try {
        const api = window.electronAPI && window.electronAPI.store;
        if (!api || typeof api.getClusterAppMatrix !== 'function') {
            toast('API Matrice Cluster non disponibile', 'error');
            return;
        }

        const res = await api.getClusterAppMatrix();
        if (!res || !res.success) {
            toast((res && res.error) || 'Errore nel recupero della matrice cluster', 'error');
            return;
        }

        const { matrix, merkleRoot, connectedNodesCount } = res.data;

        const overlay = document.createElement('div');
        overlay.className = 'store-modal-overlay';

        const matrixRows = matrix.map(app => {
            const nodesHtml = app.nodes && app.nodes.length > 0
                ? app.nodes.map(n => `<span class="badge badge-success" style="font-size:0.75rem; margin-right:4px;">${n.nodeName || n.nodeId}: v${n.version}</span>`).join('')
                : '<span style="color:var(--md-on-surface-variant); font-size:0.8rem;">Solo nodo locale</span>';

            return `
                <tr style="border-bottom: 1px solid var(--md-outline-variant);">
                    <td style="padding: 10px 8px; font-weight: 600;">${esc(app.name)} (${esc(app.appId)})</td>
                    <td style="padding: 10px 8px;"><span class="badge badge-primary">v${esc(app.version)}</span></td>
                    <td style="padding: 10px 8px;">
                        ${app.hasLocalDb ? `<span style="color:var(--md-success);">Attivo (${formatSize(app.dbSize)})</span>` : '<span style="color:var(--md-on-surface-variant);">Nessun DB</span>'}
                    </td>
                    <td style="padding: 10px 8px;">${nodesHtml}</td>
                </tr>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="store-modal" style="max-width: 800px; width: 90%;">
                <header class="versioni-testa">
                    <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 2rem;">hub</span>
                    <div>
                        <h2>Matrice di Stato del Cluster</h2>
                        <p>Visualizza la replica dei moduli applicativi e la consistenza crittografica sui nodi connessi.</p>
                    </div>
                </header>
                <div class="versioni-corpo" style="max-height: 400px; overflow-y: auto;">
                    <div style="background: var(--md-surface-variant); padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 0.85rem;">
                        <div><strong>Nodi connessi in mesh:</strong> ${connectedNodesCount}</div>
                        <div style="margin-top: 4px;"><strong>Merkle Root Stato:</strong> <code style="word-break: break-all;">${merkleRoot || 'N/A'}</code></div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--md-outline); color: var(--md-on-surface-variant);">
                                <th style="padding: 8px;">Applicazione</th>
                                <th style="padding: 8px;">Versione</th>
                                <th style="padding: 8px;">DB Locale</th>
                                <th style="padding: 8px;">Nodi Mesh</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matrixRows || '<tr><td colspan="4" style="text-align:center; padding:16px;">Nessuna app installata</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <footer class="versioni-piede" style="display: flex; justify-content: space-between; align-items: center;">
                    <button type="button" class="btn btn-secondary" id="btn-run-drift-check">
                        <span class="material-symbols-rounded">health_and_safety</span> Esegui Self-Healing Audit
                    </button>
                    <button type="button" class="btn-header-secondary" id="matrix-chiudi">Chiudi</button>
                </footer>
            </div>
        `;

        const chiudi = () => overlay.remove();
        overlay.querySelector('#matrix-chiudi').addEventListener('click', chiudi);
        overlay.addEventListener('click', e => { if (e.target === overlay) chiudi(); });

        overlay.querySelector('#btn-run-drift-check').addEventListener('click', async () => {
            try {
                toast('Verifica integrità cluster in corso...', 'info');
                const auditRes = await api.checkClusterHealth();
                if (auditRes && auditRes.status === 'HEALTHY') {
                    toast('Cluster integro al 100%: nessun disallineamento rilevato', 'success');
                } else if (auditRes && auditRes.status === 'DRIFT_REPAIRED') {
                    toast(`Rilevati e auto-riparati ${auditRes.repairedApps.length} moduli applicativi!`, 'success');
                } else {
                    toast(`Stato audit: ${(auditRes && auditRes.status) || 'Completato'}`, 'info');
                }
            } catch (aErr) {
                toast(aErr.message || 'Errore audit', 'error');
            }
        });

        document.body.appendChild(overlay);
    } catch (e) {
        toast(e.message || 'Errore apertura matrice', 'error');
    }
}
