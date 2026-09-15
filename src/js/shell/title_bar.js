import { Router, toast } from '../utils.js';
import { PAGE_TITLES, ROOT_PAGES, AUTH_PAGES } from './pages_registry.js';
import { clearLocalSession, currentUserId, leaveActiveNetwork } from './session_state.js';
import { initAppMenu } from './app_menu.js';
import { showAboutDialog } from './about_dialog.js';

const byId = (id) => document.getElementById(id);

const bindNavigation = () => {
    const btnBack = byId('btn-nav-back');
    const btnHome = byId('btn-nav-home');
    const btnLogout = byId('btn-nav-logout');
    const navTitle = byId('nav-title');
    if (btnBack) btnBack.addEventListener('click', () => Router.back());
    if (btnHome) {
        btnHome.addEventListener('click', () => {
            Router.navigate((window.currentUser || currentUserId()) ? 'dashboard' : 'auth_login');
        });
    }
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            clearLocalSession();
            toast('Disconnessione effettuata', 'info');
            Router.navigate('auth_login');
        });
    }
    window.addEventListener('router:navigated', (event) => {
        const pageName = event.detail.pageName;
        const isRootPage = ROOT_PAGES.includes(pageName);
        if (btnBack) btnBack.style.display = (!isRootPage || Router.history.length > 1) ? 'flex' : 'none';
        if (btnHome) btnHome.style.display = isRootPage ? 'none' : 'flex';
        if (btnLogout) btnLogout.style.display = AUTH_PAGES.includes(pageName) ? 'none' : 'flex';
        if (navTitle) navTitle.innerText = PAGE_TITLES[pageName] || '';
    });
};

const bindWindowControls = () => {
    byId('win-min')?.addEventListener('click', () => window.electronAPI.windowMinimize());
    byId('win-max')?.addEventListener('click', () => window.electronAPI.windowMaximize());
    byId('win-close')?.addEventListener('click', () => window.electronAPI.windowClose());
};

const MENU_ACTIONS = {
    'menu-btn-networks': async () => {
        await leaveActiveNetwork();
        Router.navigate('networks');
    },
    'menu-btn-nodes': () => Router.navigate('app_container', { appId: 'amministratore', subAppId: 'nodi' }),
    'menu-btn-store': () => Router.navigate('store'),
    'menu-btn-security': () => Router.navigate('account_security'),
    'menu-btn-logout': async () => {
        const userId = currentUserId();
        if (userId && window.electronAPI.logoutUser) await window.electronAPI.logoutUser({ userId });
        clearLocalSession();
        toast('Disconnessione effettuata', 'info');
        Router.navigate('auth_login');
    },
    'menu-btn-updates': () => {
        toast('Controllo aggiornamenti in corso...', 'info');
        window.electronAPI.checkForUpdates();
    },
    'menu-btn-github': async () => {
        const result = await window.electronAPI.openGitHub();
        if (result && result.success === false) toast(result.error || 'Collegamento non consentito.', 'error');
    },
    'menu-btn-about': () => showAboutDialog(),
    'menu-btn-devtools': async () => {
        const result = await window.electronAPI.toggleDevTools();
        if (result && result.success === false) toast(result.error || 'Operazione non consentita.', 'error');
    }
};

export const initTitleBar = () => {
    bindNavigation();
    if (!window.electronAPI) return;
    bindWindowControls();
    initAppMenu(MENU_ACTIONS);
};

export default initTitleBar;
