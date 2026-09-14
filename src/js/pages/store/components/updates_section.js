import { renderAppIcon } from './app_icon.js';

export function renderUpdatesSection(container, updates, options = {}) {
    try {
        if (!updates || updates.length === 0) {
            container.innerHTML = '';
            return;
        }

        const count = updates.length;
        const section = document.createElement('div');
        section.className = 'store-section-card';
        section.innerHTML = `
            <div class="store-section-header" id="header-updates-accordion">
                <div class="store-section-header-left">
                    <span class="material-symbols-rounded store-section-icon">system_update_alt</span>
                    <div>
                        <div class="store-section-title">Aggiornamenti disponibili (${count})</div>
                        <div class="store-section-subtitle">Aggiornamenti forniti dagli editori pronti per essere installati</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    ${options.canManage ? `
                    <button id="btn-update-all-section" class="btn-fetch-updates" style="padding: 0.45rem 1rem; font-size: 0.85rem;">
                        <span class="material-symbols-rounded" style="font-size: 1.1rem;">download</span> Aggiorna tutto
                    </button>` : ''}
                    <span class="material-symbols-rounded" id="icon-updates-chevron" style="color: var(--md-on-surface-variant); transition: transform 0.2s;">expand_less</span>
                </div>
            </div>
            <div class="store-list-table" id="body-updates-accordion"></div>
        `;

        const body = section.querySelector('#body-updates-accordion');
        updates.forEach(app => {
            const row = document.createElement('div');
            row.className = 'store-row-item';

            row.innerHTML = `
                <div class="store-app-icon-wrap">${renderAppIcon(app)}</div>
                <div class="store-app-meta">
                    <div class="store-app-name" title="${app.name || app.id}">${app.name || app.id}</div>
                    <div class="store-app-author">${app.author || 'NunzioTech'}</div>
                </div>
                <div class="store-app-type-tag">App</div>
                <div class="store-app-status-text has-update">Aggiornamento disponibile · v${app.availableVersion}</div>
                <div>
                    ${options.canManage ? `
                    <button class="store-action-btn-primary btn-update-active" data-app-id="${app.id || app.appId}">
                        <span class="material-symbols-rounded" style="font-size: 1.1rem;">download</span> Aggiorna
                    </button>` : `<span style="font-size: 0.8rem; color: var(--md-on-surface-variant);">Richiedi SuperAdmin</span>`}
                </div>
                <div>
                    <button class="store-more-btn" data-more-id="${app.id || app.appId}" title="Dettagli">
                        <span class="material-symbols-rounded">more_horiz</span>
                    </button>
                </div>
            `;

            const btnUpdate = row.querySelector('.btn-update-active');
            if (btnUpdate) {
                btnUpdate.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    btnUpdate.disabled = true;
                    btnUpdate.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; font-size: 1.1rem;">sync</span> In corso...`;
                    if (typeof options.onUpdate === 'function') {
                        await options.onUpdate(app.id || app.appId);
                    }
                });
            }

            const btnMore = row.querySelector('.store-more-btn');
            if (btnMore) {
                btnMore.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof options.onDetails === 'function') {
                        options.onDetails(app);
                    }
                });
            }

            body.appendChild(row);
        });

        const btnUpdateAll = section.querySelector('#btn-update-all-section');
        if (btnUpdateAll) {
            btnUpdateAll.addEventListener('click', async (e) => {
                e.stopPropagation();
                btnUpdateAll.disabled = true;
                btnUpdateAll.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite; font-size: 1.1rem;">sync</span> In corso...`;
                if (typeof options.onUpdateAll === 'function') {
                    await options.onUpdateAll();
                }
            });
        }

        const header = section.querySelector('#header-updates-accordion');
        const chevron = section.querySelector('#icon-updates-chevron');
        header.addEventListener('click', () => {
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'flex' : 'none';
            chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        container.innerHTML = '';
        container.appendChild(section);
    } catch (e) {
        console.error(e);
    }
}
