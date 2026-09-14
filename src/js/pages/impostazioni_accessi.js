import { dtFormat } from '../utils.js';

const EVENT_LABELS = {
    login_success: 'Accesso riuscito',
    login_failed: 'Accesso fallito',
    '2fa_failed': 'Verifica 2FA fallita',
    '2fa_admin_reset': 'Reset 2FA (admin)',
    logout: 'Disconnessione'
};
const EVENT_ICONS = {
    login_success: 'login',
    login_failed: 'block',
    '2fa_failed': 'gpp_bad',
    '2fa_admin_reset': 'restart_alt',
    logout: 'logout'
};

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const statistica = (icona, valore, etichetta, tono) => `
    <div class="k-stat">
        <span class="k-stat-icon material-symbols-rounded" style="background: var(--md-${tono}-container); color: var(--md-${tono});">${icona}</span>
        <div><div class="k-stat-value">${valore}</div><div class="k-stat-label">${etichetta}</div></div>
    </div>`;

async function contenuto() {
    const currentUserId = sessionStorage.getItem('currentUserId');
    if (!currentUserId) {
        return '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Utente non identificato.</div></div>';
    }
    let logs = [];
    try {
        const res = await window.electronAPI.getAccessLogs(currentUserId);
        if (res && res.success && Array.isArray(res.logs)) logs = res.logs;
    } catch (e) {
        console.error('[Registro accessi] Lettura non riuscita:', e);
    }
    const riusciti = logs.filter(l => (l.event_type || 'login_success') === 'login_success').length;
    const falliti = logs.filter(l => l.success === 0 || l.success === false).length;
    const dispositivi = new Set(logs.map(l => l.device_info).filter(Boolean)).size;

    const tabella = logs.length === 0 ? `
        <div class="k-empty">
            <span class="material-symbols-rounded">history_toggle_off</span>
            <div class="k-empty-title">Nessun accesso registrato</div>
            <p class="k-empty-text">Gli accessi al tuo account compariranno qui.</p>
        </div>` : `
        <div class="k-table-wrap" style="border: 0; border-radius: 0;">
            <table class="k-table">
                <thead><tr><th>Data e ora</th><th>Evento</th><th>Metodo</th><th>Nodo</th><th>Indirizzo IP</th><th>Dispositivo</th></tr></thead>
                <tbody>
                    ${logs.map(log => {
                        const tipo = log.event_type || 'login_success';
                        const fallito = log.success === 0 || log.success === false;
                        return `
                            <tr>
                                <td style="white-space: nowrap; font-variant-numeric: tabular-nums;">${esc(dtFormat(log.timestamp))}</td>
                                <td><span class="k-badge k-badge--${fallito ? 'danger' : 'success'}"><span class="material-symbols-rounded">${EVENT_ICONS[tipo] || 'event'}</span>${esc(EVENT_LABELS[tipo] || tipo)}</span></td>
                                <td class="k-muted">${esc(log.auth_method || '—')}</td>
                                <td>${esc(log.node_name || 'Sconosciuto')}</td>
                                <td class="k-mono k-muted">${esc(log.ip_address || 'N/D')}</td>
                                <td class="k-muted">${esc(log.device_info || 'N/D')}</td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;

    return `
        <div class="k-stack">
            <div class="k-grid k-grid--sm">
                ${statistica('login', riusciti, 'Accessi riusciti', 'success')}
                ${statistica('block', falliti, 'Tentativi falliti', 'error')}
                ${statistica('devices', dispositivi, 'Dispositivi distinti', 'primary')}
            </div>
            <section class="k-card k-card--flush">
                <div class="k-card-header">
                    <div>
                        <h2 class="k-card-title"><span class="material-symbols-rounded">manage_search</span>Ultimi eventi</h2>
                        <p class="k-card-subtitle">Gli ultimi 50 eventi di autenticazione sul tuo account.</p>
                    </div>
                </div>
                ${tabella}
            </section>
        </div>`;
}

export default {
    render: async (el) => {
        const html = await contenuto();
        if (!el) return html;
        el.innerHTML = `
            <div class="k-page k-page--form fade-in-up">
                <header class="k-page-header">
                    <div class="k-page-heading">
                        <span class="k-page-icon material-symbols-rounded">manage_search</span>
                        <div>
                            <h1 class="k-page-title">Registro accessi</h1>
                            <p class="k-page-subtitle">Storico degli accessi e dei tentativi sul tuo account.</p>
                        </div>
                    </div>
                </header>
                ${html}
            </div>`;
        return html;
    }
};
