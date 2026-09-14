import { conferma, avviso, chiedi } from './shell/dialogo.js';

export { conferma, avviso, chiedi };

export const Router = {
    history: [],
    currentPage: null,
    currentParams: {},
    navigate: async (pageName, params = {}, isBack = false) => {
        try {
            const el = document.getElementById('main-content');
            if (!el) return;
            const lastPage = Router.history[Router.history.length - 1];
            const isDifferentPage = !lastPage || lastPage.pageName !== pageName || JSON.stringify(lastPage.params) !== JSON.stringify(params);
            if (!isBack && isDifferentPage) {
                if (!['oobe', 'auth_login', 'auth_register', 'networks'].includes(pageName)) {
                    Router.history.push({ pageName, params });
                }
            }
            el.innerHTML = '';
            const page = window.Pages[pageName];
            if (page && typeof page.render === 'function') {
                Router.currentPage = pageName;
                Router.currentParams = params;
                await page.render(el, params);
                window.dispatchEvent(new CustomEvent('router:navigated', { detail: { pageName } }));
            } else {
                el.innerHTML = `<h1>404</h1>`;
            }
        } catch (e) {
            console.error(e);
            toast("Errore di navigazione", "error");
        }
    },
    back: () => {
        if (Router.history.length > 1) {
            Router.history.pop();
            const prev = Router.history[Router.history.length - 1];
            Router.navigate(prev.pageName, prev.params, true);
        } else {
            Router.history = [];
            if (window.electronAPI) {
                window.electronAPI.checkIsRegistered().then(reg => {
                    Router.navigate(reg ? 'auth_login' : 'networks', {}, true);
                });
            } else {
                Router.navigate('networks', {}, true);
            }
        }
    }
};

const TOAST_ICONE = { info: 'info', success: 'check_circle', error: 'error', warning: 'warning' };
const TOAST_DURATA_MS = 4000;

export const toast = (message, type = 'info') => {
    try {
        let regione = document.getElementById('toast-container');
        if (!regione) {
            regione = document.createElement('div');
            regione.id = 'toast-container';
            regione.className = 'k-toast-region';
            regione.setAttribute('role', 'status');
            regione.setAttribute('aria-live', 'polite');
            document.body.appendChild(regione);
        }
        const variante = TOAST_ICONE[type] ? type : 'info';
        const elemento = document.createElement('div');
        elemento.className = `k-toast k-toast--${variante}`;
        const icona = document.createElement('span');
        icona.className = 'material-symbols-rounded k-toast-icon';
        icona.textContent = TOAST_ICONE[variante];
        const testo = document.createElement('span');
        testo.textContent = String(message ?? '');
        elemento.append(icona, testo);
        regione.appendChild(elemento);
        requestAnimationFrame(() => elemento.classList.add('is-visible'));
        setTimeout(() => {
            elemento.classList.remove('is-visible');
            setTimeout(() => elemento.remove(), 250);
        }, TOAST_DURATA_MS);
    } catch (e) {
        console.error(e);
    }
};

export const Modal = {
    conferma,
    avviso,
    chiedi,
    show: ({ title, content } = {}) => avviso({ titolo: title, testo: content })
};

export const fmt = {
    euro: (val) => {
        try {
            return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
        } catch (e) {
            console.error(e);
            return val;
        }
    },
    data: (date) => {
        try {
            return new Intl.DateTimeFormat('it-IT').format(new Date(date));
        } catch (e) {
            console.error(e);
            return date;
        }
    }
};
export const dtFormat = (date) => {
    try {
        return new Intl.DateTimeFormat('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date(date));
    } catch(e) {
        return date;
    }
};
