export function trovaDipendenzeMancanti(idBersaglio, allApps = [], visitati = new Set()) {
    const mancanti = [];
    const bersaglio = allApps.find(a => a.id === idBersaglio);
    if (!bersaglio || !bersaglio.dependencies) return mancanti;
    const deps = Array.isArray(bersaglio.dependencies)
        ? bersaglio.dependencies
        : Object.keys(bersaglio.dependencies);
    for (const depId of deps) {
        if (visitati.has(depId)) continue;
        visitati.add(depId);
        const depApp = allApps.find(a => a.id === depId);
        const installata = depApp && Boolean(depApp.installed || depApp.isInstalled || depApp.core || depApp.bundled);
        if (!installata) {
            mancanti.push(depApp || { id: depId, name: depId });
        }
        mancanti.push(...trovaDipendenzeMancanti(depId, allApps, visitati));
    }
    return mancanti;
}

export function chiediConfermaDipendenze(appBersaglio, dipendenzeMancanti) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10005; backdrop-filter: blur(4px);';

        const modal = document.createElement('div');
        modal.style.cssText = 'max-width: 520px; width: 90%; background: var(--md-surface); border: 1px solid var(--md-outline-variant); border-radius: 18px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 1.2rem;';

        modal.innerHTML = `
            <div style="display: flex; gap: 0.8rem; align-items: center;">
                <span class="material-symbols-rounded" style="font-size: 2rem; color: var(--md-primary);">extension</span>
                <div>
                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--md-on-surface); font-weight: 700;">Installazione con Dipendenze Obbligatorie</h3>
                    <div style="font-size: 0.88rem; color: var(--md-on-surface-variant); margin-top: 0.2rem;">Conferma installazione requisiti</div>
                </div>
            </div>
            <div style="font-size: 0.95rem; color: var(--md-on-surface); line-height: 1.5;">
                Per poter funzionare correttamente, l'applicazione <strong>${appBersaglio.name || appBersaglio.id}</strong> richiede obbligatoriamente le seguenti applicazioni:
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.4rem; background: var(--md-surface-variant); padding: 0.9rem; border-radius: 10px;">
                ${dipendenzeMancanti.map(d => `
                    <div style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; color: var(--md-on-surface);">
                        <span class="material-symbols-rounded" style="font-size: 1.1rem; color: var(--md-primary);">check_circle</span>
                        <span><strong>${d.name || d.id}</strong> <span style="font-size: 0.8rem; opacity: 0.8;">(${d.id})</span></span>
                    </div>
                `).join('')}
            </div>
            <div style="font-size: 0.92rem; color: var(--md-on-surface); font-weight: 500;">
                Queste applicazioni verranno installate contestualmente. Sei d'accordo a procedere con l'installazione?
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.8rem; margin-top: 0.5rem;">
                <button id="btn-annulla-deps" class="btn-header-secondary">Annulla</button>
                <button id="btn-conferma-deps" class="btn-fetch-updates">Accetta e Installa</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('#btn-annulla-deps')?.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        modal.querySelector('#btn-conferma-deps')?.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
    });
}
