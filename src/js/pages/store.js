import { Router, toast } from '../utils.js';
import { categoriaDi, elencoCategorie } from '../shell/app_categories.js';
import { renderUpdatesSection } from './store/components/updates_section.js';
import { renderInstalledSection } from './store/components/installed_section.js';
import { openAppDetailsModal } from './store/components/app_details_modal.js';
import { openRepoModal } from './store/components/repo_modal.js';
import { openClusterMatrixModal } from './store/components/cluster_matrix_modal.js';
import { apriDisinstallazione } from './store/components/uninstall_modal.js';
import { apriVersioni } from './store/components/versioni_modal.js';

async function isSuperadmin() {
    try {
        const userId = sessionStorage.getItem('currentUserId');
        if (!userId || !window.electronAPI || !window.electronAPI.rbac) return false;
        const perms = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
        return Array.isArray(perms) && perms.includes('*');
    } catch (e) {
        return false;
    }
}

export default {
    render: async (el) => {
        try {
            const userId = sessionStorage.getItem('currentUserId');
            if (!window.currentUser && !userId) {
                Router.navigate('auth_login');
                return;
            }
            const admin = await isSuperadmin();

            let allApps = [];
            let availableUpdates = [];
            let currentTab = 'all';
            let currentCategory = 'all';
            let currentSort = 'updated_desc';
            let searchQuery = '';

            el.innerHTML = `
                <div class="store-view-container fade-in-up">
                    <div class="store-top-header">
                        <div class="store-title-wrap">
                            <span class="material-symbols-rounded store-title-icon">storefront</span>
                            <div>
                                <h1 class="store-main-title">App Store</h1>
                                <div style="font-size: 0.88rem; color: var(--md-on-surface-variant); margin-top: 0.2rem;">
                                    ${admin ? 'Installa le applicazioni con le loro dipendenze e tieni aggiornati KORADEST e le app del nodo.' : 'Consulta le applicazioni disponibili, quelle installate e gli aggiornamenti.'}
                                </div>
                            </div>
                        </div>
                        <div class="store-header-actions">
                            ${admin ? `
                            <button id="btn-open-matrix" class="btn-header-secondary">
                                <span class="material-symbols-rounded">hub</span> Matrice Cluster
                            </button>
                            <button id="btn-open-repos" class="btn-header-secondary">
                                <span class="material-symbols-rounded">dns</span> Repository
                            </button>` : ''}
                            <button id="btn-fetch-updates-top" class="btn-fetch-updates">
                                <span class="material-symbols-rounded" id="icon-fetch-spinner">sync</span> Recupera aggiornamenti
                            </button>
                        </div>
                    </div>


                    <div class="store-toolbar-row">
                        <div class="store-filter-chips">
                            <button class="store-chip-btn active" data-tab="all">Tutte le app</button>
                            <button class="store-chip-btn" data-tab="updates">Aggiornamenti <span id="chip-updates-count" style="display: none; background: var(--md-primary); color: white; border-radius: 9999px; padding: 1px 7px; font-size: 0.75rem; margin-left: 4px;">0</span></button>
                            <button class="store-chip-btn" data-tab="installed">Installate</button>
                            <button class="store-chip-btn" data-tab="core">Sistema</button>
                        </div>
                        <div class="store-controls-right">
                            <select id="store-category-filter" class="store-select-filter">
                                <option value="all">Tutte le categorie</option>
                                ${elencoCategorie().map(c => `<option value="${c.id}">${c.etichetta}</option>`).join('')}
                            </select>
                            <select id="store-sort-filter" class="store-select-filter">
                                <option value="updated_desc">Ultimo aggiornamento</option>
                                <option value="name_asc">Nome (A - Z)</option>
                                <option value="installed_desc">Data installazione</option>
                            </select>
                            <div class="store-search-box">
                                <span class="material-symbols-rounded">search</span>
                                <input type="text" id="store-search-input" class="store-search-input" placeholder="Cerca applicazione...">
                            </div>
                        </div>
                    </div>

                    <div id="section-updates-slot"></div>
                    <div id="section-installed-slot"></div>
                </div>
            `;

            const sectionUpdates = el.querySelector('#section-updates-slot');
            const sectionInstalled = el.querySelector('#section-installed-slot');
            const chipUpdatesCount = el.querySelector('#chip-updates-count');
            const btnFetch = el.querySelector('#btn-fetch-updates-top');
            const iconFetch = el.querySelector('#icon-fetch-spinner');
            const searchInput = el.querySelector('#store-search-input');
            const categoryFilter = el.querySelector('#store-category-filter');
            const sortFilter = el.querySelector('#store-sort-filter');

            const loadData = async (forceCheck = false) => {
                try {
                    if (forceCheck && iconFetch) {
                        iconFetch.style.animation = 'spin 1s linear infinite';
                        btnFetch.disabled = true;
                    }

                    if (window.electronAPI) {
                        const [availableRes, coreRes, registryApps, updatesRes] = await Promise.all([
                            window.electronAPI.store && window.electronAPI.store.getAvailable ? window.electronAPI.store.getAvailable() : { success: false, data: [] },
                            window.electronAPI.store && window.electronAPI.store.getCoreApps ? window.electronAPI.store.getCoreApps() : { success: false, data: [] },
                            window.electronAPI.getAppsRegistry ? window.electronAPI.getAppsRegistry() : [],
                            window.electronAPI.store && window.electronAPI.store.checkUpdates ? window.electronAPI.store.checkUpdates() : { success: false, data: [] }
                        ]);

                        const marketplaceApps = availableRes && availableRes.success && Array.isArray(availableRes.data) ? availableRes.data : [];
                        const coreApps = coreRes && coreRes.success && Array.isArray(coreRes.data) ? coreRes.data : [];
                        const localRegistry = Array.isArray(registryApps) ? registryApps : [];
                        availableUpdates = updatesRes && updatesRes.success && Array.isArray(updatesRes.data) ? updatesRes.data : [];

                        const updatesMap = new Map(availableUpdates.map(u => [u.appId, u]));
                        const combinedMap = new Map();

                        coreApps.forEach(app => {
                            combinedMap.set(app.id, {
                                ...app,
                                installed: true,
                                core: true,
                                isInstalled: true,
                                published_at: app.published_at || '2026-08-20T10:00:00Z',
                                installed_at: app.installed_at || '2026-08-20T10:00:00Z',
                                updated_at: app.updated_at || null
                            });
                        });

                        localRegistry.forEach(app => {
                            const existing = combinedMap.get(app.id) || {};
                            combinedMap.set(app.id, {
                                ...existing,
                                ...app,
                                installed: true,
                                isInstalled: true,
                                published_at: app.published_at || existing.published_at || null,
                                installed_at: app.installed_at || existing.installed_at || null,
                                updated_at: app.updated_at || existing.updated_at || null
                            });
                        });

                        marketplaceApps.forEach(app => {
                            const existing = combinedMap.get(app.id) || {};
                            const isAlreadyInstalled = Boolean(existing.installed || existing.isInstalled || app.installed);
                            combinedMap.set(app.id, {
                                ...existing,
                                ...app,
                                installed: isAlreadyInstalled,
                                isInstalled: isAlreadyInstalled,
                                version: isAlreadyInstalled ? (existing.version || app.installedVersion || app.version) : app.version,
                                published_at: app.published_at || existing.published_at || null,
                                installed_at: app.installed_at || existing.installed_at || null,
                                updated_at: app.updated_at || existing.updated_at || null
                            });
                        });

                        allApps = Array.from(combinedMap.values()).map(a => {
                            const u = updatesMap.get(a.id) || updatesMap.get(a.folder);
                            return {
                                ...a,
                                hasUpdate: Boolean(u),
                                availableVersion: u ? u.availableVersion : a.version
                            };
                        });
                    }

                    if (chipUpdatesCount) {
                        const totalUpdates = allApps.filter(a => a.hasUpdate).length;
                        if (totalUpdates > 0) {
                            chipUpdatesCount.textContent = String(totalUpdates);
                            chipUpdatesCount.style.display = 'inline-block';
                        } else {
                            chipUpdatesCount.style.display = 'none';
                        }
                    }

                    renderViews();
                } catch (err) {
                    console.error(err);
                } finally {
                    if (iconFetch) iconFetch.style.animation = 'none';
                    if (btnFetch) btnFetch.disabled = false;
                }
            };

            const executeUpdate = async (appId) => {
                try {
                    if (!window.electronAPI?.store?.install) return;
                    const res = await window.electronAPI.store.install(appId);
                    if (res && res.success) {
                        toast(`Aggiornamento completato con successo`);
                        await loadData(true);
                    } else {
                        toast(res?.error || 'Errore durante l\'aggiornamento');
                        await loadData(false);
                    }
                } catch (e) {
                    toast(e.message || 'Errore');
                    await loadData(false);
                }
            };

            const executeUpdateAll = async () => {
                try {
                    const toUpdate = allApps.filter(a => a.hasUpdate);
                    for (const u of toUpdate) {
                        await executeUpdate(u.id || u.appId);
                    }
                    toast('Tutti gli aggiornamenti sono stati completati');
                } catch (e) {
                    toast(e.message || 'Errore');
                }
            };

            const executeInstall = async (appId) => {
                try {
                    if (!window.electronAPI?.store?.install) return;
                    const res = await window.electronAPI.store.install(appId);
                    if (res && res.success) {
                        const dipendenze = (res.data && res.data.dipendenze) || [];
                        const nomi = dipendenze.map(id => (allApps.find(a => a.id === id) || {}).name || id);
                        toast(nomi.length > 0 ? `Installazione completata, insieme a: ${nomi.join(', ')}` : 'Installazione completata');
                        await loadData(true);
                    } else {
                        toast(res?.error || 'Errore installazione', 'error');
                        await loadData(false);
                    }
                } catch (e) {
                    toast(e.message || 'Errore');
                }
            };

            const eseguiRimozione = async (appId) => {
                try {
                    if (!window.electronAPI?.store?.uninstall) return;
                    const res = await window.electronAPI.store.uninstall(appId);
                    if (res && res.success) {
                        const dati = res.data || {};
                        if (dati.completo === false) {
                            toast(`Disinstallata, ma ${dati.falliti.length} elementi non sono stati rimossi`, 'error');
                        } else {
                            toast(`Applicazione disinstallata: ${dati.rimossi || 0} elementi eliminati`);
                        }
                        await loadData(true);
                    } else {
                        toast(res?.error || 'Errore disinstallazione', 'error');
                    }
                } catch (e) {
                    toast(e.message || 'Errore', 'error');
                }
            };

            const executeUninstall = async (appId) => {
                const app = (allApps || []).find(a => a.id === appId) || { id: appId };
                await apriDisinstallazione(app, eseguiRimozione);
            };

            const apriArchivioVersioni = async (appId) => {
                const app = (allApps || []).find(a => a.id === appId) || { id: appId };
                await apriVersioni(app, async (id, versione) => {
                    try {
                        if (!window.electronAPI?.store?.installaVersione) return;
                        toast(`Installazione della versione ${versione} in corso...`);
                        const res = await window.electronAPI.store.installaVersione({ appId: id, versione });
                        if (res && res.success) {
                            toast(`Versione ${versione} installata`);
                            await loadData(true);
                        } else {
                            toast(res?.error || 'Errore installazione versione', 'error');
                        }
                    } catch (e) {
                        toast(e.message || 'Errore', 'error');
                    }
                });
            };

            const parseDate = (val) => {
                if (!val) return 0;
                if (typeof val === 'number') return val < 10000000000 ? val * 1000 : val;
                const d = Date.parse(val);
                return isNaN(d) ? 0 : d;
            };

            const renderViews = () => {
                let filteredApps = allApps.filter(a => {
                    if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        const match = (a.name && a.name.toLowerCase().includes(q))
                            || (a.id && a.id.toLowerCase().includes(q))
                            || (a.author && a.author.toLowerCase().includes(q))
                            || (a.description && a.description.toLowerCase().includes(q));
                        if (!match) return false;
                    }

                    if (currentCategory !== 'all' && categoriaDi(a).id !== currentCategory) return false;

                    return true;
                });

                if (currentTab === 'updates') {
                    filteredApps = filteredApps.filter(a => a.hasUpdate);
                } else if (currentTab === 'installed') {
                    filteredApps = filteredApps.filter(a => a.installed || a.isInstalled || a.core || a.bundled);
                } else if (currentTab === 'core') {
                    filteredApps = filteredApps.filter(a => a.core || a.bundled);
                }

                filteredApps.sort((a, b) => {
                    if (currentSort === 'updated_desc') {
                        return parseDate(b.updated_at) - parseDate(a.updated_at);
                    }
                    if (currentSort === 'installed_desc') {
                        return parseDate(b.installed_at) - parseDate(a.installed_at);
                    }
                    if (currentSort === 'name_asc') {
                        return (a.name || a.id).localeCompare(b.name || b.id);
                    }
                    return 0;
                });

                const apriDettagli = (app) => openAppDetailsModal(app, {
                    canManage: admin,
                    onInstall: executeInstall,
                    onUpdate: executeUpdate,
                    onUninstall: executeUninstall,
                    onVersions: apriArchivioVersioni,
                    trovaApp: id => allApps.find(voce => voce.id === id) || null
                });

                if (currentTab === 'all' || currentTab === 'updates') {
                    renderUpdatesSection(sectionUpdates, allApps.filter(a => a.hasUpdate), {
                        canManage: admin,
                        onUpdate: executeUpdate,
                        onUpdateAll: executeUpdateAll,
                        onDetails: apriDettagli
                    });
                } else {
                    sectionUpdates.innerHTML = '';
                }

                renderInstalledSection(sectionInstalled, filteredApps, {
                    title: currentTab === 'updates' ? 'Aggiornamenti pronti' : (currentTab === 'installed' ? 'Applicazioni installate' : (currentTab === 'core' ? 'Moduli di sistema' : 'Aggiornamenti recenti e applicazioni')),
                    canManage: admin,
                    onInstall: executeInstall,
                    onDetails: apriDettagli
                });
            };

            el.querySelectorAll('.store-chip-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    el.querySelectorAll('.store-chip-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentTab = btn.dataset.tab;
                    renderViews();
                });
            });

            categoryFilter?.addEventListener('change', (e) => {
                currentCategory = e.target.value;
                renderViews();
            });

            sortFilter?.addEventListener('change', (e) => {
                currentSort = e.target.value;
                renderViews();
            });

            searchInput?.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                renderViews();
            });

            btnFetch?.addEventListener('click', () => loadData(true));
            el.querySelector('#btn-open-repos')?.addEventListener('click', openRepoModal);
            el.querySelector('#btn-open-matrix')?.addEventListener('click', openClusterMatrixModal);

            if (window.electronAPI?.store?.onAppUpdated) {

                window.electronAPI.store.onAppUpdated(() => loadData(false));
            }

            await loadData(false);
        } catch (e) {
            console.error(e);
            el.innerHTML = `<p style="padding: 2rem; color: var(--md-error);">Errore durante il caricamento di App Store & Update Hub</p>`;
        }
    }
};
