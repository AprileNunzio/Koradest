import { Router } from '../utils.js';
import { networksApi, leaveActiveNetwork } from './session_state.js';

const STATUS_INTERVAL_MS = 3000;
const LOGS_INTERVAL_MS = 10000;

const byId = (id) => document.getElementById(id);

export const refreshNetworkChip = async (quorumState) => {
    const label = byId('sb-network');
    if (!label) return;
    const icon = label.previousElementSibling;
    const api = networksApi();
    let active = null;
    if (api) {
        const result = await api.getActive();
        active = result && result.active ? result.active : null;
    }
    label.innerText = active ? active.name : 'Nessuna rete';
    if (!icon) return;
    if (!active) {
        icon.style.color = 'var(--md-outline)';
    } else if (quorumState && quorumState.satisfied === false) {
        icon.style.color = 'var(--md-error)';
    } else {
        icon.style.color = active.color || 'var(--md-primary)';
    }
};

const paintSystem = (status, isOffline) => {
    const sysEl = byId('sb-system');
    if (!sysEl || !sysEl.previousElementSibling) return;
    const icon = sysEl.previousElementSibling;
    if (isOffline) {
        sysEl.innerText = 'Isolamento Rete';
        icon.style.color = 'var(--md-error)';
        icon.innerText = 'wifi_off';
        return;
    }
    sysEl.innerText = status.isOk ? 'Sistema OK' : 'Errore';
    icon.style.color = status.isOk ? 'var(--md-success)' : 'var(--md-error)';
    icon.innerText = status.isOk ? 'check_circle' : 'error';
};

const paintSync = (syncState) => {
    const syncEl = byId('sb-sync');
    const syncIcon = byId('sb-sync-icon');
    if (!syncEl || !syncIcon || !syncState) return;
    syncEl.innerText = syncState;
    const running = syncState.includes('corso') || syncState.includes('Controllo');
    syncIcon.style.animation = running ? 'spin 2s linear infinite' : 'none';
    if (running) syncIcon.style.color = 'var(--md-warning)';
    else syncIcon.style.color = syncState.includes('Errore') ? 'var(--md-error)' : 'var(--md-primary)';
};

const pollStatus = async () => {
    if (!window.electronAPI) return;
    try {
        const status = await window.electronAPI.getAppStatus();
        const ips = await window.electronAPI.getLocalIPs();
        if (!status) return;
        const isOffline = !navigator.onLine || ips.length === 0;
        const verEl = byId('sb-version');
        if (verEl) verEl.innerText = `Versione ${status.version}`;
        paintSystem(status, isOffline);
        const nodesEl = byId('sb-nodes');
        if (nodesEl) nodesEl.innerText = `Nodi Connessi: ${status.connectedNodes}`;
        const ipEl = byId('sb-ip');
        if (ipEl && ipEl.previousElementSibling) {
            ipEl.innerText = isOffline ? 'IP: Offline' : `IP: ${ips[0]}`;
            ipEl.previousElementSibling.style.color = isOffline ? 'var(--md-error)' : 'var(--md-secondary)';
        }
        paintSync(status.syncState);
    } catch (e) {
        console.error('[StatusBar] Aggiornamento stato non riuscito:', e.message);
    }
};

const pollDistributedLogs = async () => {
    if (!window.electronAPI || !window.electronAPI.rbac) return;
    const container = byId('sb-errors-container');
    if (!container) return;
    try {
        const result = await window.electronAPI.rbac.getDistributedLogs();
        if (!result || !result.success) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        const count = result.logs.length;
        const label = byId('sb-errors');
        if (label) label.textContent = `Errori: ${count}`;
        container.style.color = count > 0 ? 'var(--md-error)' : 'var(--md-outline)';
        container.classList.toggle('pulse-animation', count > 0);
    } catch (_) {
        container.style.display = 'none';
    }
};

const bindShortcuts = () => {
    byId('sb-network-container')?.addEventListener('click', async () => {
        await leaveActiveNetwork();
        Router.navigate('networks');
    });
    byId('sb-nodes-container')?.addEventListener('click', () => Router.navigate('nodes_manager'));
    byId('sb-system-container')?.addEventListener('click', () => Router.navigate('network_analyzer'));
    byId('sb-version-container')?.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.checkForUpdates();
    });
    byId('sb-errors-container')?.addEventListener('click', () => {
        Router.navigate('app_container', { appId: 'amministratore', subAppId: 'errori_sync' });
    });
    byId('sb-sync-container')?.addEventListener('click', async () => {
        const icon = byId('sb-sync-icon');
        if (icon) icon.style.animation = 'spin 1s linear infinite';
        if (window.electronAPI && window.electronAPI.forceSync) await window.electronAPI.forceSync();
    });
};

export const initStatusBar = () => {
    bindShortcuts();
    refreshNetworkChip();
    setInterval(pollStatus, STATUS_INTERVAL_MS);
    setInterval(pollDistributedLogs, LOGS_INTERVAL_MS);
};

export default initStatusBar;
