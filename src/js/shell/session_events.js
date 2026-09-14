import { Router, toast } from '../utils.js';
import { clearLocalSession, currentUserId, networksApi } from './session_state.js';
import { refreshNetworkChip } from './status_bar.js';

const unmountRunningApp = (appId) => {
    if (window.__currentMountedApp && typeof window.__currentMountedApp.unmount === 'function') {
        try { window.__currentMountedApp.unmount(); } catch (_) {}
    }
    window.__currentMountedApp = null;
    const styleNode = document.querySelector(`link[data-app-css="${appId}"]`);
    if (styleNode) styleNode.remove();
};

const bindForceLogout = (api) => {
    if (!api.onForceLogout) return;
    api.onForceLogout((data) => {
        if (currentUserId() !== data.userId) return;
        clearLocalSession();
        toast(
            `Sei stato disconnesso perche hai effettuato l accesso presso il nodo "${data.nodeName || 'Sconosciuto'}" (IP: ${data.ipAddress || 'Sconosciuto'}) in data ${new Date().toLocaleString('it-IT')}.`,
            'error'
        );
        Router.navigate('auth_login');
    });
};

const bindUserKicked = (api) => {
    if (!api.onUserKicked) return;
    api.onUserKicked((data) => {
        if (currentUserId() !== data.userId) return;
        clearLocalSession();
        toast('Credenziali modificate da remoto. Disconnessione forzata.', 'error');
        setTimeout(() => Router.navigate('auth_login'), 1500);
    });
};

const bindAppUninstalled = (api) => {
    if (!api.onAppUninstalled) return;
    api.onAppUninstalled((data) => {
        if (!data || !data.appId) return;
        toast(`Applicazione ${data.appId} disinstallata dal cluster`, 'info');
        const params = Router.currentParams;
        const isRunning = Router.currentPage === 'app_container' && params && (params.appId === data.appId || params.folder === data.appId);
        if (!isRunning) return;
        unmountRunningApp(data.appId);
        Router.navigate('dashboard');
    });
};

const bindNetworkEvents = () => {
    const api = networksApi();
    if (!api) return;
    api.onActivated(() => refreshNetworkChip());
    api.onQuorumChanged((state) => refreshNetworkChip(state));
    api.onDeactivated(() => {
        clearLocalSession();
        refreshNetworkChip();
    });
    api.onQuorumLost((data) => {
        clearLocalSession();
        refreshNetworkChip({ satisfied: false });
        toast((data && data.message) || 'Quorum di rete non raggiunto: sessione chiusa.', 'error');
        Router.navigate('auth_login');
    });
};

export const initSessionEvents = () => {
    const api = window.electronAPI;
    if (!api) return;
    bindForceLogout(api);
    bindUserKicked(api);
    bindAppUninstalled(api);
    bindNetworkEvents();
    if (api.onSyncAnomaly) {
        api.onSyncAnomaly((data) => toast(data.message || 'Anomalia nei dati di sincronizzazione', 'error'));
    }
};

export default initSessionEvents;
