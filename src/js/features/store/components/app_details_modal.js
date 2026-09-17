import { Router } from '../../../utils.js';
import { renderAppIcon } from './app_icon.js';
import { categoriaDi } from '../../../shell/app_categories.js';
import { esc } from '../../../shared/html.js';

function dipendenzeDichiarate(app) {
    const dichiarate = app && app.dependencies;
    const voci = Array.isArray(dichiarate)
        ? dichiarate.map(id => ({ id, vincolo: '*' }))
        : Object.entries(dichiarate && typeof dichiarate === 'object' ? dichiarate : {}).map(([id, vincolo]) => ({ id, vincolo: vincolo || '*' }));
    return voci.filter(voce => typeof voce.id === 'string' && voce.id && !voce.id.startsWith('core'));
}

function formatDataEstesa(val) {
    try {
        if (!val) return '—';
        let ts = val;
        if (typeof val === 'string' && /^\d+$/.test(val)) ts = Number(val);
        if (typeof ts === 'number') {
            const ms = ts < 10000000000 ? ts * 1000 : ts;
            return new Date(ms).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return '—';
    } catch (_) {
        return '—';
    }
}

export function openAppDetailsModal(app, options = {}) {
    try {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);';

        const modal = document.createElement('div');
        modal.style.cssText = 'max-width: 680px; width: 90%; max-height: 85vh; background: var(--md-surface); border: 1px solid var(--md-outline-variant); border-radius: 18px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); overflow-y: auto; display: flex; flex-direction: column; gap: 1.2rem;';

        const isInstalled = Boolean(app.installed || app.isInstalled || app.core || app.bundled);
        const hasUpdate = Boolean(app.hasUpdate);

        const dataPubblicazione = formatDataEstesa(app.published_at || app.release_date);
        const dataInstallazione = formatDataEstesa(app.installed_at);
        const dataAggiornamento = formatDataEstesa(app.updated_at);

        const categoria = categoriaDi(app);
        const autore = app.author || (app.core ? 'KORADEST' : 'Autore non indicato');
        const trovaApp = typeof options.trovaApp === 'function' ? options.trovaApp : () => null;
        const dipendenze = dipendenzeDichiarate(app).map(({ id, vincolo }) => {
            const nota = trovaApp(id);
            const installata = Boolean(nota && (nota.installed || nota.isInstalled || nota.core || nota.bundled));
            return {
                nome: (nota && nota.name) || id,
                vincolo,
                stato: installata ? 'Installata' : (nota ? 'Verrà installata' : 'Non disponibile nello Store'),
                colore: installata ? 'var(--md-primary)' : (nota ? 'var(--md-on-surface-variant)' : 'var(--md-error)')
            };
        });

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; gap: 1.2rem; align-items: center;">
                    <div style="width: 64px; height: 64px; border-radius: 14px; background: var(--md-surface-variant); border: 1px solid var(--md-outline-variant); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${renderAppIcon(app)}
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.4rem; color: var(--md-on-surface); font-weight: 700;">${esc(app.name || app.id)}</h2>
                        <div style="font-size: 0.88rem; color: var(--md-on-surface-variant); margin-top: 0.2rem;">${esc(app.author || 'NunzioTech')} · Versione ${esc(app.version || '1.0.0')}</div>
                    </div>
                </div>
                <button id="btn-close-details" class="store-more-btn" style="font-size: 1.2rem;">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>

            <div style="display: flex; gap: 0.8rem; align-items: center; padding-top: 0.4rem; flex-wrap: wrap;">
                ${isInstalled ? `
                <button id="btn-modal-open" class="btn-fetch-updates">
                    <span class="material-symbols-rounded">open_in_new</span> Apri applicazione
                </button>` : `
                <button id="btn-modal-install" class="btn-fetch-updates">
                    <span class="material-symbols-rounded">cloud_download</span> Ottieni applicazione
                </button>`}

                ${hasUpdate && options.canManage ? `
                <button id="btn-modal-update" class="store-action-btn-primary btn-update-active" style="padding: 0.75rem 1.4rem;">
                    <span class="material-symbols-rounded">download</span> Aggiorna a v${app.availableVersion}
                </button>` : ''}

                ${isInstalled && !app.core && !app.bundled && options.canManage ? `
                <button id="btn-modal-versioni" class="btn-header-secondary">
                    <span class="material-symbols-rounded">inventory_2</span> Versioni
                </button>` : ''}

                ${isInstalled && !app.core && !app.bundled && options.canManage ? `
                <button id="btn-modal-uninstall" class="btn-header-secondary" style="color: var(--md-error);">
                    <span class="material-symbols-rounded">delete</span> Disinstalla
                </button>` : ''}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; background: var(--md-surface-variant); padding: 1rem; border-radius: 12px;">
                <div>
                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--md-on-surface-variant); text-transform: uppercase;">Data Pubblicazione</div>
                    <div style="font-size: 0.95rem; font-weight: 600; color: var(--md-on-surface); margin-top: 0.2rem;">${dataPubblicazione}</div>
                </div>
                <div>
                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--md-on-surface-variant); text-transform: uppercase;">Prima Installazione</div>
                    <div style="font-size: 0.95rem; font-weight: 600; color: var(--md-on-surface); margin-top: 0.2rem;">${dataInstallazione}</div>
                </div>
                <div>
                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--md-on-surface-variant); text-transform: uppercase;">Ultimo Aggiornamento</div>
                    <div style="font-size: 0.95rem; font-weight: 600; color: var(--md-on-surface); margin-top: 0.2rem;">${dataAggiornamento}</div>
                </div>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <span style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.7rem; border-radius: 99px; background: var(--md-surface-variant); color: var(--md-on-surface-variant);">
                    <span class="material-symbols-rounded" style="font-size: 1rem;">${esc(categoria.icona)}</span> ${esc(categoria.etichetta)}
                </span>
                <span style="font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.7rem; border-radius: 99px; background: var(--md-surface-variant); color: var(--md-on-surface-variant);">Autore: ${esc(autore)}</span>
            </div>

            ${dipendenze.length > 0 ? `
            <div style="border-top: 1px solid var(--md-outline-variant); padding-top: 1rem;">
                <h4 style="margin: 0 0 0.3rem 0; font-size: 1rem; font-weight: 700; color: var(--md-on-surface);">Richiede (${dipendenze.length})</h4>
                <p style="margin: 0 0 0.6rem 0; font-size: 0.82rem; color: var(--md-on-surface-variant);">Le applicazioni mancanti vengono installate automaticamente prima di questa. I loro dati non vengono duplicati: questa app li legge dall'applicazione che li gestisce.</p>
                <div style="display: flex; flex-direction: column; gap: 0.35rem; background: var(--md-surface-variant); padding: 0.8rem; border-radius: 8px;">
                    ${dipendenze.map(d => `
                        <div style="display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; color: var(--md-on-surface);">
                            <span><strong>${esc(d.nome)}</strong>${d.vincolo !== '*' ? ` <span style="color: var(--md-on-surface-variant);">${esc(d.vincolo)}</span>` : ''}</span>
                            <span style="color: ${d.colore}; font-weight: 600;">${esc(d.stato)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <div style="border-top: 1px solid var(--md-outline-variant); padding-top: 1rem; color: var(--md-on-surface); font-size: 0.95rem; line-height: 1.6;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 700;">Descrizione</h4>
                <p style="margin: 0; color: var(--md-on-surface-variant);">${esc(app.long_description || app.description || 'Nessuna descrizione dettagliata fornita.')}</p>
            </div>

            ${Array.isArray(app.rbacPermissions) && app.rbacPermissions.length > 0 ? `
            <div style="border-top: 1px solid var(--md-outline-variant); padding-top: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 700; color: var(--md-on-surface);">Permessi RBAC Dichiarati (${app.rbacPermissions.length})</h4>
                <div style="display: flex; flex-direction: column; gap: 0.4rem; max-height: 140px; overflow-y: auto; background: var(--md-surface-variant); padding: 0.8rem; border-radius: 8px;">
                    ${app.rbacPermissions.map(p => `
                        <div style="font-size: 0.82rem; color: var(--md-on-surface);">
                            <strong>${p.id}</strong>: ${p.label || ''}
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
        `;

        modal.querySelector('#btn-close-details')?.addEventListener('click', () => overlay.remove());

        modal.querySelector('#btn-modal-open')?.addEventListener('click', () => {
            overlay.remove();
            if (app.core || app.bundled) {
                Router.navigate(app.id);
            } else {
                Router.navigate('app_container', { appId: app.id });
            }
        });

        modal.querySelector('#btn-modal-install')?.addEventListener('click', async () => {
            overlay.remove();
            if (typeof options.onInstall === 'function') {
                await options.onInstall(app.id);
            }
        });

        modal.querySelector('#btn-modal-update')?.addEventListener('click', async () => {
            overlay.remove();
            if (typeof options.onUpdate === 'function') {
                await options.onUpdate(app.id);
            }
        });

        modal.querySelector('#btn-modal-versioni')?.addEventListener('click', async () => {
            overlay.remove();
            if (typeof options.onVersions === 'function') {
                await options.onVersions(app.id);
            }
        });

        modal.querySelector('#btn-modal-uninstall')?.addEventListener('click', async () => {
            overlay.remove();
            if (typeof options.onUninstall === 'function') {
                await options.onUninstall(app.id);
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    } catch (e) {
        console.error(e);
    }
}
