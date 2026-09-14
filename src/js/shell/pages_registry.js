import dashboard from '../pages/dashboard.js';
import auth_register from '../pages/auth_register.js';
import auth_login from '../pages/auth_login.js';
import auth_force_change from '../pages/auth_force_change.js';
import oobe from '../pages/oobe.js';
import app_container from '../pages/app_container.js';
import network_analyzer from '../pages/network_analyzer.js';
import nodes_manager from '../pages/nodes/index.js';
import networks_manager from '../pages/networks/index.js';
import impostazioni_accessi from '../pages/impostazioni_accessi.js';
import account_security from '../pages/account_security.js';
import store from '../pages/store.js';
import info from '../pages/info.js';

export const PAGES = {
    dashboard,
    auth_register,
    auth_login,
    auth_force_change,
    oobe,
    networks: networks_manager,
    app_container,
    network_analyzer,
    nodes_manager,
    impostazioni_accessi,
    account_security,
    store,
    info
};

export const PAGE_TITLES = {
    dashboard: 'Dashboard',
    network_analyzer: 'Analisi di Rete',
    app_container: 'Applicazione',
    oobe: 'Setup Iniziale',
    networks: 'Reti Blockchain',
    auth_login: 'Autenticazione',
    auth_register: 'Registrazione',
    nodes_manager: 'Gestione Nodi',
    account_security: 'Sicurezza Account',
    store: 'App Store'
};

export const ROOT_PAGES = ['dashboard', 'auth_login', 'auth_register', 'oobe', 'networks'];
export const AUTH_PAGES = ['auth_login', 'auth_register', 'oobe', 'networks'];

export default PAGES;
