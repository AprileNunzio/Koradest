import { toast } from '../../../utils.js';

export async function openRepoModal() {
    try {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);';

        const modal = document.createElement('div');
        modal.style.cssText = 'max-width: 620px; width: 90%; background: var(--md-surface); border: 1px solid var(--md-outline-variant); border-radius: 18px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 1.2rem;';

        const renderCorpo = async () => {
            let repos = [];
            try {
                if (window.electronAPI?.store?.getRepositories) {
                    const res = await window.electronAPI.store.getRepositories();
                    if (res && res.success) repos = res.data || [];
                }
            } catch (_) {}

            modal.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span class="material-symbols-rounded" style="color: var(--md-primary); font-size: 1.5rem;">dns</span>
                        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface);">Repository Marketplace</h2>
                    </div>
                    <button id="btn-close-repos" class="store-more-btn">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div style="font-size: 0.88rem; color: var(--md-on-surface-variant); line-height: 1.5;">
                    Gestisci le sorgenti e i repository da cui il sistema recupera i cataloghi delle applicazioni e gli aggiornamenti di terze parti.
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 220px; overflow-y: auto;">
                    ${repos.map(r => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--md-surface-variant); border-radius: 8px;">
                            <div>
                                <div style="font-weight: 700; font-size: 0.9rem; color: var(--md-on-surface);">${r.name || 'Repository'}</div>
                                <div style="font-size: 0.8rem; color: var(--md-on-surface-variant); font-family: monospace;">${r.url}</div>
                            </div>
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--md-primary); background: var(--md-surface); padding: 2px 8px; border-radius: 4px;">ATTIVO</span>
                        </div>
                    `).join('')}
                </div>

                <div style="display: flex; gap: 0.6rem;">
                    <input type="text" id="input-new-repo-url" class="input" placeholder="https://dominio.com/marketplace.json" style="flex: 1; padding: 0.6rem 1rem; border-radius: 8px; background: var(--md-surface-variant); border: 1px solid var(--md-outline-variant);">
                    <button id="btn-add-repo" class="btn-fetch-updates" style="padding: 0.6rem 1.2rem;">
                        <span class="material-symbols-rounded">add</span> Aggiungi
                    </button>
                </div>

                <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--md-outline-variant); padding-top: 1rem;">
                    <button id="btn-done-repos" class="btn-header-secondary">Chiudi</button>
                </div>
            `;

            modal.querySelector('#btn-close-repos')?.addEventListener('click', () => overlay.remove());
            modal.querySelector('#btn-done-repos')?.addEventListener('click', () => overlay.remove());

            modal.querySelector('#btn-add-repo')?.addEventListener('click', async () => {
                const url = modal.querySelector('#input-new-repo-url')?.value?.trim();
                if (!url) return;
                try {
                    if (window.electronAPI?.store?.addRepository) {
                        const res = await window.electronAPI.store.addRepository({ name: 'Custom Repo', url });
                        if (res && res.success) {
                            toast('Repository aggiunto con successo');
                            renderCorpo();
                        } else {
                            toast(res?.error || 'Impossibile aggiungere repository');
                        }
                    }
                } catch (e) {
                    toast(e.message || 'Errore');
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
