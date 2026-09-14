import { toast } from '../../../../js/utils.js';
import { markup } from './vista.js';

const INTERVALLO_PREDEFINITO = '4';

function impostaSelect(select, valore) {
    try {
        const desiderato = String(valore || INTERVALLO_PREDEFINITO);
        const esiste = Array.from(select.options).some(o => o.value === desiderato);
        select.value = esiste ? desiderato : INTERVALLO_PREDEFINITO;
    } catch (e) {
        select.value = INTERVALLO_PREDEFINITO;
    }
}

async function caricaBadge(campi) {
    try {
        if (window.electronAPI && window.electronAPI.getAppStatus) {
            const stato = await window.electronAPI.getAppStatus();
            if (stato && stato.version) campi.coreVersionBadge.textContent = `v${stato.version}`;
        }
    } catch (e) {}
    try {
        if (window.electronAPI && window.electronAPI.store && window.electronAPI.store.getInstalled) {
            const res = await window.electronAPI.store.getInstalled();
            if (res && res.success && Array.isArray(res.data)) {
                campi.appsCountBadge.textContent = `${res.data.length} App installate`;
            }
        }
    } catch (e) {}
}

async function caricaImpostazioni(campi) {
    try {
        if (!window.electronAPI || !window.electronAPI.getUpdateSettings) return;
        const res = await window.electronAPI.getUpdateSettings();
        if (!res || !res.data) return;
        const d = res.data;
        campi.coreModeManual.checked = d.updates_core_mode === 'manual';
        campi.coreModeAuto.checked = !campi.coreModeManual.checked;
        campi.coreAutoCheck.checked = d.updates_core_auto_check !== false;
        impostaSelect(campi.coreInterval, d.updates_core_check_hours);
        campi.appsModeManual.checked = d.updates_apps_mode === 'manual';
        campi.appsModeAuto.checked = !campi.appsModeManual.checked;
        campi.appsAutoCheck.checked = d.updates_apps_auto_check !== false;
        impostaSelect(campi.appsInterval, d.updates_apps_check_hours);
        campi.autoClearCache.checked = d.auto_clear_cache_on_update !== false;
        aggiornaDisponibilita(campi);
    } catch (e) {
        toast('Impossibile leggere le impostazioni di aggiornamento: ' + e.message, 'error');
    }
}

function aggiornaDisponibilita(campi) {
    try {
        campi.coreInterval.disabled = !campi.coreAutoCheck.checked;
        campi.appsInterval.disabled = !campi.appsAutoCheck.checked;
        campi.coreInterval.style.opacity = campi.coreInterval.disabled ? '0.5' : '1';
        campi.appsInterval.style.opacity = campi.appsInterval.disabled ? '0.5' : '1';
    } catch (e) {}
}

async function salva(campi, btnSave) {
    const originale = btnSave.innerHTML;
    try {
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="material-symbols-rounded spin">sync</span> Salvataggio...';
        const payload = {
            updates_core_mode: campi.coreModeManual.checked ? 'manual' : 'auto',
            updates_core_auto_check: campi.coreAutoCheck.checked,
            updates_core_check_hours: Number(campi.coreInterval.value),
            updates_apps_mode: campi.appsModeManual.checked ? 'manual' : 'auto',
            updates_apps_auto_check: campi.appsAutoCheck.checked,
            updates_apps_check_hours: Number(campi.appsInterval.value),
            auto_clear_cache_on_update: campi.autoClearCache.checked
        };
        const res = await window.electronAPI.saveUpdateSettings(payload);
        if (res && res.success) {
            toast('Impostazioni aggiornamenti salvate e applicate subito.', 'success');
        } else {
            toast('Errore durante il salvataggio: ' + ((res && res.error) || 'Impossibile salvare'), 'error');
        }
    } catch (e) {
        toast('Errore: ' + e.message, 'error');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = originale;
    }
}

async function verificaCore(box) {
    try {
        box.style.display = 'block';
        box.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem;"><span class="material-symbols-rounded spin">sync</span> Ricerca aggiornamenti KORADEST in corso...</div>';
        await window.electronAPI.checkForUpdates();
    } catch (e) {
        box.style.display = 'block';
        box.textContent = 'Errore durante la verifica: ' + e.message;
    }
}

async function verificaApp(box, campi) {
    try {
        box.style.display = 'block';
        box.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem;"><span class="material-symbols-rounded spin">sync</span> Ricerca aggiornamenti Store in corso...</div>';
        const res = await window.electronAPI.store.checkUpdates();
        if (!res || !res.success || !Array.isArray(res.data)) {
            box.textContent = 'Nessun nuovo aggiornamento disponibile.';
            return;
        }
        if (res.data.length === 0) {
            box.innerHTML = '<div style="color:#2e7d32;font-weight:600;display:flex;align-items:center;gap:0.4rem;"><span class="material-symbols-rounded">check_circle</span> Tutte le applicazioni dello Store sono aggiornate.</div>';
            return;
        }
        const coda = campi.appsModeAuto.checked
            ? 'Installazione automatica avviata su questo nodo.'
            : 'Modalita manuale: avvia l installazione dallo Store quando preferisci.';
        box.innerHTML = `<div style="color:var(--md-primary);font-weight:600;display:flex;align-items:center;gap:0.4rem;"><span class="material-symbols-rounded">info</span> Trovati ${res.data.length} aggiornamenti disponibili. ${coda}</div>`;
        if (campi.appsModeAuto.checked) {
            await window.electronAPI.store.forceCheckUpdates();
        }
    } catch (e) {
        box.style.display = 'block';
        box.textContent = 'Errore durante la verifica dello Store: ' + e.message;
    }
}

async function svuotaCache(btn) {
    const originale = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-rounded spin">sync</span> Pulizia cache in corso...';
        const res = await window.electronAPI.clearAppCache();
        if (res && res.success) {
            toast('Cache HTTP, moduli e session storage svuotati con successo!', 'success');
        } else {
            toast('Errore durante la pulizia della cache: ' + ((res && res.error) || 'Operazione fallita'), 'error');
        }
    } catch (e) {
        toast('Errore: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originale;
    }
}

export default {
    render: async (el) => {
        try {
            el.innerHTML = markup();

            const campi = {
                coreModeAuto: el.querySelector('#core-mode-auto'),
                coreModeManual: el.querySelector('#core-mode-manual'),
                coreAutoCheck: el.querySelector('#core-auto-check'),
                coreInterval: el.querySelector('#core-check-interval'),
                appsModeAuto: el.querySelector('#apps-mode-auto'),
                appsModeManual: el.querySelector('#apps-mode-manual'),
                appsAutoCheck: el.querySelector('#apps-auto-check'),
                appsInterval: el.querySelector('#apps-check-interval'),
                autoClearCache: el.querySelector('#auto-clear-cache'),
                coreVersionBadge: el.querySelector('#core-version-badge'),
                appsCountBadge: el.querySelector('#apps-count-badge')
            };

            const coreStatusBox = el.querySelector('#core-status-box');
            const appsStatusBox = el.querySelector('#apps-status-box');
            const btnSave = el.querySelector('#btn-save-settings');

            await caricaBadge(campi);
            await caricaImpostazioni(campi);

            campi.coreAutoCheck.addEventListener('change', () => aggiornaDisponibilita(campi));
            campi.appsAutoCheck.addEventListener('change', () => aggiornaDisponibilita(campi));

            btnSave.addEventListener('click', () => salva(campi, btnSave));
            el.querySelector('#btn-check-core').addEventListener('click', () => verificaCore(coreStatusBox));
            el.querySelector('#btn-check-apps').addEventListener('click', () => verificaApp(appsStatusBox, campi));
            el.querySelector('#btn-clear-cache-now').addEventListener('click', (evento) => svuotaCache(evento.currentTarget));

            if (window.electronAPI && window.electronAPI.onUpdateStatus) {
                window.electronAPI.onUpdateStatus((data) => {
                    try {
                        if (!data) return;
                        coreStatusBox.style.display = 'block';
                        coreStatusBox.textContent = data.status || 'Operazione in corso...';
                    } catch (e) {}
                });
            }
        } catch (e) {
            el.innerHTML = '<div style="padding: 2rem; color: var(--md-error);">Errore rendering modulo Aggiornamenti: ' + e.message + '</div>';
        }
    }
};
