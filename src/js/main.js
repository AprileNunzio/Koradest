import { Router } from './utils.js';
import { PAGES } from './shell/pages_registry.js';
import initTitleBar from './shell/title_bar.js';
import initStatusBar from './shell/status_bar.js';
import initUpdateOverlay from './shell/update_overlay.js';
import initSessionEvents from './shell/session_events.js';
import initGlobalErrorHandling from './shell/global_errors.js';

const SPLASH_DELAY_MS = 2000;
const SPLASH_FADE_MS = 800;

const dismissSplash = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (!splash) return;
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => splash.remove(), SPLASH_FADE_MS);
    }, SPLASH_DELAY_MS);
};

const landingPage = async () => {
    if (!window.electronAPI || !window.electronAPI.networks) return 'networks';
    const result = await window.electronAPI.networks.getActive();
    if (!result || !result.active) return 'networks';
    const registered = await window.electronAPI.checkIsRegistered();
    return registered ? 'auth_login' : 'auth_register';
};

const ensureLocalConfig = async () => {
    if (!window.electronAPI) return;
    const hasConfig = await window.electronAPI.hasConfig();
    if (!hasConfig) await window.electronAPI.saveConfig({ setupComplete: true });
};

window.Router = Router;
window.Pages = PAGES;

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalErrorHandling();
    dismissSplash();
    initTitleBar();
    initStatusBar();
    initUpdateOverlay();
    initSessionEvents();
    await ensureLocalConfig();
    Router.navigate(await landingPage());
});
