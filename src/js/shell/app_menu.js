import { esc } from '../pages/networks/network_dom.js';
import { MENU_ENTRIES } from './app_menu_entries.js';
import { APP_MENU_STYLES } from './app_menu_styles.js';
import { currentUserId, networksApi } from './session_state.js';

const PANEL_ID = 'app-dropdown-menu';

let _actions = {};
let _lastFocused = null;

const panel = () => document.getElementById(PANEL_ID);
const trigger = () => document.getElementById('app-menu-btn');

const readContext = async () => {
    const userId = currentUserId();
    const context = {
        isLoggedIn: Boolean(userId),
        hasActiveNetwork: false,
        isSuperadmin: false,
        isDevBuild: false,
        networkName: null,
        userName: null
    };
    const api = networksApi();
    if (api) {
        const result = await api.getActive();
        if (result && result.active) {
            context.hasActiveNetwork = true;
            context.networkName = result.active.name;
        }
    }
    if (userId && window.electronAPI && window.electronAPI.rbac) {
        const permissions = await window.electronAPI.rbac.getEffectiveUserPermissions(userId);
        const list = Array.isArray(permissions) ? permissions : (permissions && permissions.permissions) || [];
        context.isSuperadmin = list.includes('*');
    }
    if (window.electronAPI && typeof window.electronAPI.getAppStatus === 'function') {
        const status = await window.electronAPI.getAppStatus();
        context.isDevBuild = Boolean(status && status.isDevBuild);
    }
    try {
        context.userName = sessionStorage.getItem('currentUser') || null;
    } catch (_) {}
    return context;
};

const renderContextHeader = (context) => {
    if (!context.hasActiveNetwork && !context.isLoggedIn) return '';
    const net = context.hasActiveNetwork
        ? `<div class="menu-context-net"><span class="material-symbols-rounded">hub</span>${esc(context.networkName)}</div>`
        : '<div class="menu-context-net"><span class="material-symbols-rounded">hub_off</span>Nessuna rete attiva</div>';
    const user = context.isLoggedIn
        ? `<div class="menu-context-user">${esc(context.userName || 'Sessione attiva')}${context.isSuperadmin ? ' - amministratore' : ''}</div>`
        : '<div class="menu-context-user">Nessun utente connesso</div>';
    return `<div class="menu-context">${net}${user}</div>`;
};

const renderEntries = (context) => {
    const parts = [];
    let pendingSeparator = false;
    for (const entry of MENU_ENTRIES) {
        if (entry.type === 'separator') {
            pendingSeparator = parts.length > 0;
            continue;
        }
        if (!entry.visible(context)) continue;
        if (pendingSeparator) {
            parts.push('<div class="menu-separator" role="separator"></div>');
            pendingSeparator = false;
        }
        parts.push(`
            <button type="button" class="menu-item-btn" id="${esc(entry.id)}" role="menuitem" tabindex="-1">
                <span class="material-symbols-rounded" aria-hidden="true">${esc(entry.icon)}</span>
                <span class="menu-item-text">
                    <span>${esc(entry.label)}</span>
                    <span class="menu-item-hint">${esc(entry.hint)}</span>
                </span>
            </button>
        `);
    }
    return parts.join('');
};

const items = () => Array.from(panel().querySelectorAll('.menu-item-btn'));

const focusItem = (index) => {
    const list = items();
    if (list.length === 0) return;
    const target = list[(index + list.length) % list.length];
    target.focus();
};

const isOpen = () => panel().getAttribute('data-open') === 'true';

export const closeMenu = ({ restoreFocus = false } = {}) => {
    const node = panel();
    if (!node || !isOpen()) return;
    node.setAttribute('data-open', 'false');
    node.style.display = 'none';
    const button = trigger();
    if (button) button.setAttribute('aria-expanded', 'false');
    if (restoreFocus && _lastFocused && document.contains(_lastFocused)) _lastFocused.focus();
    _lastFocused = null;
};

const bindEntries = () => {
    for (const button of items()) {
        const handler = _actions[button.id];
        if (typeof handler !== 'function') {
            button.disabled = true;
            continue;
        }
        button.addEventListener('click', async () => {
            closeMenu();
            await handler();
        });
    }
};

export const openMenu = async () => {
    const node = panel();
    if (!node) return;
    _lastFocused = document.activeElement;
    const context = await readContext();
    node.innerHTML = renderContextHeader(context) + renderEntries(context);
    bindEntries();
    node.setAttribute('data-open', 'true');
    node.style.display = 'flex';
    const button = trigger();
    if (button) button.setAttribute('aria-expanded', 'true');
    focusItem(0);
};

const onKeydown = (event) => {
    if (!panel() || !isOpen()) return;
    const list = items();
    const current = list.indexOf(document.activeElement);
    if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusItem(current + 1);
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusItem(current - 1);
        return;
    }
    if (event.key === 'Home') {
        event.preventDefault();
        focusItem(0);
        return;
    }
    if (event.key === 'End') {
        event.preventDefault();
        focusItem(list.length - 1);
    }
};

export const initAppMenu = (actions) => {
    _actions = actions || {};
    const button = trigger();
    const node = panel();
    if (!button || !node) return;
    document.head.insertAdjacentHTML('beforeend', APP_MENU_STYLES);
    node.setAttribute('role', 'menu');
    node.setAttribute('aria-labelledby', 'app-menu-btn');
    node.setAttribute('data-open', 'false');
    button.setAttribute('role', 'button');
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Menu applicazione');
    button.setAttribute('tabindex', '0');
    button.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (isOpen()) closeMenu({ restoreFocus: true });
        else await openMenu();
    });
    button.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        if (!isOpen()) await openMenu();
    });
    node.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => closeMenu());
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('router:navigated', () => closeMenu());
};

export default initAppMenu;
