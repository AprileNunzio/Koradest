import { toast } from '../../../utils.js';

export async function openRepoModal(onUpdated) {
    try {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);';

        const modal = document.createElement('div');
        modal.style.cssText = 'max-width: 650px; width: 92%; background: var(--md-surface); border: 1px solid var(--md-outline-variant); border-radius: 18px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 1.2rem; max-height: 90vh; overflow-y: auto;';

        const renderCorpo = async () => {
            let repos = [];
            try {
                if (window.electronAPI?.store?.listRepositories) {
                    const res = await window.electronAPI.store.listRepositories();
                    if (res && res.success) repos = res.data || [];
                }
            } catch (_) {}

            modal.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.6rem;">dns</span>
                        <h2 style="margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--md-on-surface);">Sorgenti e Repository</h2>
                    </div>
                    <button id="btn-close-repos" class="k-btn k-btn--ghost k-btn--sm" aria-label="Chiudi">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div style="font-size: 0.88rem; color: var(--md-on-surface-variant); line-height: 1.45;">
                    Configura i cataloghi remoti delle applicazioni. I repository configurati vengono interrogati in tempo reale per scoprire nuovi moduli e aggiornamenti.
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 280px; overflow-y: auto;">
                    ${repos.length === 0 ? '<div style="padding: 1rem; text-align: center; color: var(--md-on-surface-variant);">Nessun repository configurato.</div>' : ''}
                    ${repos.map(r => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--md-surface-variant); border-radius: 10px; gap: 0.8rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-weight: 700; font-size: 0.92rem; color: var(--md-on-surface);">${r.label || r.name || 'Repository'}</span>
                                    <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: var(--md-surface); color: ${r.enabled ? 'var(--md-primary)' : 'var(--md-outline)'}; font-weight: 700;">
                                        ${r.enabled ? 'ATTIVO' : 'DISATTIVATO'}
                                    </span>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--md-on-surface-variant); font-family: monospace; word-break: break-all; margin-top: 2px;">${r.url}</div>
                                ${r.last_error ? `<div style="font-size: 0.75rem; color: var(--md-error); margin-top: 2px;">${r.last_error}</div>` : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <label class="k-switch" title="${r.enabled ? 'Disattiva' : 'Attiva'}">
                                    <input type="checkbox" data-toggle-repo="${r.id}" ${r.enabled ? 'checked' : ''} aria-label="Attiva o disattiva repository">
                                    <span class="k-switch-track"></span>
                                </label>
                                <button class="k-btn k-btn--sm k-btn--danger-ghost" data-remove-repo="${r.id}" title="Elimina repository">
                                    <span class="material-symbols-rounded">delete</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="input-new-repo-url" class="k-input" placeholder="https://dominio.com/marketplace.json" style="flex: 1; min-width: 220px;">
                    <button id="btn-add-repo" class="k-btn k-btn--primary">
                        <span class="material-symbols-rounded">add</span> Aggiungi sorgente
                    </button>
                </div>

                <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--md-outline-variant); padding-top: 0.8rem;">
                    <button id="btn-done-repos" class="k-btn">Chiudi</button>
                </div>
            `;

            modal.querySelector('#btn-close-repos')?.addEventListener('click', () => {
                overlay.remove();
                if (typeof onUpdated === 'function') onUpdated();
            });
            modal.querySelector('#btn-done-repos')?.addEventListener('click', () => {
                overlay.remove();
                if (typeof onUpdated === 'function') onUpdated();
            });

            modal.querySelectorAll('[data-toggle-repo]').forEach(input => {
                input.addEventListener('change', async () => {
                    const id = input.dataset.toggleRepo;
                    try {
                        if (window.electronAPI?.store?.setRepositoryEnabled) {
                            await window.electronAPI.store.setRepositoryEnabled(id, input.checked);
                            toast('Stato repository aggiornato', 'success');
                            renderCorpo();
                        }
                    } catch (e) {
                        toast(e.message || 'Errore', 'error');
                    }
                });
            });

            modal.querySelectorAll('[data-remove-repo]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.removeRepo;
                    try {
                        if (window.electronAPI?.store?.removeRepository) {
                            const res = await window.electronAPI.store.removeRepository(id);
                            if (res && res.success) {
                                toast('Repository rimosso', 'success');
                                renderCorpo();
                            } else {
                                toast((res && res.error) || 'Impossibile rimuovere il repository', 'error');
                            }
                        }
                    } catch (e) {
                        toast(e.message || 'Errore', 'error');
                    }
                });
            });

            modal.querySelector('#btn-add-repo')?.addEventListener('click', async () => {
                const url = modal.querySelector('#input-new-repo-url')?.value?.trim();
                if (!url) return;
                try {
                    if (window.electronAPI?.store?.addRepository) {
                        const res = await window.electronAPI.store.addRepository({ url });
                        if (res && res.success) {
                            toast('Repository aggiunto con successo', 'success');
                            renderCorpo();
                        } else {
                            toast((res && res.error) || 'Impossibile aggiungere il repository', 'error');
                        }
                    }
                } catch (e) {
                    toast(e.message || 'Errore', 'error');
                }
            });
        };

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        renderCorpo();
    } catch (e) {
        console.error(e);
    }
}
