import dashboard from '../features/dashboard/index.js';
import auth_register from '../features/auth/auth_register.js';
import auth_login from '../features/auth/auth_login.js';
import auth_force_change from '../features/auth/auth_force_change.js';
import oobe from '../features/oobe/index.js';
import app_container from '../features/app_container/index.js';
import network_analyzer from '../features/network_analyzer/index.js';
import nodes_manager from '../features/nodes/index.js';
import networks_manager from '../features/networks/index.js';
import impostazioni_accessi from '../features/impostazioni_accessi/index.js';
import account_security from '../features/account_security/index.js';
import store from '../features/store/index.js';
import info from '../features/info/index.js';

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
    impostazioni_accessi: 'Impostazioni di Accesso',
    info: 'Informazioni',
    store: 'App Store'
};

export const ROOT_PAGES = ['dashboard', 'auth_login', 'auth_register', 'oobe', 'networks'];
export const AUTH_PAGES = ['auth_login', 'auth_register', 'oobe', 'networks'];

export default PAGES;
