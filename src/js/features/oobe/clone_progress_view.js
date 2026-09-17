const STEPS = [
    { id: 'handshake', title: 'Handshake & Sicurezza', desc: 'Negoziazione crittografica e verifica autorizzazione' },
    { id: 'database', title: 'Database di Sistema', desc: 'Download e decifratura domini e ledger DAG' },
    { id: 'apps', title: 'Applicazioni di Terze Parti', desc: 'Sincronizzazione pacchetti ZIP e installazione' },
    { id: 'settings', title: 'Impostazioni & Servizi', desc: 'Allineamento parametri e avvio modulo P2P' }
];

export function createCloneProgressModal() {
    try {
        let modal = document.getElementById('clone-progress-modal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'clone-progress-modal';
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; z-index: 99999;
        `;
        const stepsHtml = STEPS.map(s => `
            <div id="step-row-${s.id}" style="display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(255, 255, 255, 0.04); margin-bottom: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease;">
                <div id="step-icon-${s.id}" style="width: 36px; height: 36px; border-radius: 50%; background: var(--md-surface-variant, #2a2d34); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--md-on-surface-variant, #888);">
                    <span class="material-symbols-rounded" style="font-size: 1.25rem;">hourglass_empty</span>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div id="step-title-${s.id}" style="font-weight: 600; font-size: 0.95rem; color: var(--md-on-surface, #fff);">${s.title}</div>
                    <div id="step-desc-${s.id}" style="font-size: 0.8rem; color: var(--md-on-surface-variant, #aaa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.desc}</div>
                </div>
                <div id="step-status-${s.id}" style="font-size: 0.8rem; font-weight: 600; color: var(--md-outline, #666);">In attesa</div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="background: var(--md-surface, #1e2025); border: 1px solid var(--md-outline-variant, rgba(255,255,255,0.15)); border-radius: 24px; padding: 2rem; width: 520px; max-width: 90vw; box-shadow: 0 24px 48px rgba(0,0,0,0.5); text-align: left;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="width: 48px; height: 48px; border-radius: 16px; background: var(--md-primary-container, #224270); display: flex; align-items: center; justify-content: center; color: var(--md-primary, #a8c8ff);">
                        <span class="material-symbols-rounded" style="font-size: 2rem;">sync</span>
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--md-on-surface, #fff);">Sincronizzazione Rete P2P</h2>
                        <p id="clone-modal-node-name" style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: var(--md-primary, #a8c8ff); font-family: monospace;">Collegamento in corso...</p>
                    </div>
                </div>
                <div id="clone-steps-container">
                    ${stepsHtml}
                </div>
                <div id="clone-footer-status" style="margin-top: 1.5rem; padding: 0.75rem; border-radius: 12px; background: rgba(255,255,255,0.03); text-align: center; font-size: 0.85rem; color: var(--md-on-surface-variant, #aaa);">
                    Inizializzazione trasferimento sicuro...
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    } catch (_) {
        return null;
    }
}

export function updateCloneStep(data) {
    try {
        const { step, label, status } = data;
        if (!step) return;
        const iconEl = document.getElementById(`step-icon-${step}`);
        const descEl = document.getElementById(`step-desc-${step}`);
        const statusEl = document.getElementById(`step-status-${step}`);
        const rowEl = document.getElementById(`step-row-${step}`);
        const footerEl = document.getElementById('clone-footer-status');
        if (footerEl && label) footerEl.textContent = label;
        if (descEl && label) descEl.textContent = label;
        if (status === 'running') {
            if (rowEl) {
                rowEl.style.borderColor = 'var(--md-primary, #64B5F6)';
                rowEl.style.background = 'rgba(100, 181, 246, 0.08)';
            }
            if (iconEl) {
                iconEl.style.background = 'var(--md-primary-container, #1a365d)';
                iconEl.style.color = 'var(--md-primary, #64B5F6)';
                iconEl.innerHTML = '<span class="material-symbols-rounded" style="font-size: 1.25rem; animation: spin 1s linear infinite;">sync</span>';
            }
            if (statusEl) {
                statusEl.textContent = 'In corso...';
                statusEl.style.color = 'var(--md-primary, #64B5F6)';
            }
        } else if (status === 'done') {
            if (rowEl) {
                rowEl.style.borderColor = 'rgba(76, 175, 80, 0.3)';
                rowEl.style.background = 'rgba(76, 175, 80, 0.08)';
            }
            if (iconEl) {
                iconEl.style.background = 'rgba(76, 175, 80, 0.2)';
                iconEl.style.color = '#4CAF50';
                iconEl.innerHTML = '<span class="material-symbols-rounded" style="font-size: 1.25rem;">check_circle</span>';
            }
            if (statusEl) {
                statusEl.textContent = 'Completato';
                statusEl.style.color = '#4CAF50';
            }
        }
    } catch (_) {}
}

export function closeCloneProgressModal() {
    try {
        const modal = document.getElementById('clone-progress-modal');
        if (modal) modal.remove();
    } catch (_) {}
}
