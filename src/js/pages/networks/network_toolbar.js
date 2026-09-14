import { esc } from './network_dom.js';

const BUTTONS = [
    { action: 'create', icon: 'add_circle', label: 'Nuova rete', variant: 'net-btn-primary' },
    { action: 'join', icon: 'travel_explore', label: 'Entra in una rete', variant: '' },
    { action: 'recover', icon: 'key', label: 'Recupera con un kit', variant: '' },
    { action: 'refresh', icon: 'refresh', label: 'Aggiorna elenco', variant: '' },
    { action: 'leave', icon: 'logout', label: 'Esci dalla rete attiva', variant: '', activeOnly: true },
    { action: 'quorum', icon: 'groups', label: 'Regole di accesso', variant: '', activeOnly: true }
];

export const renderToolbar = (hasActiveNetwork) => `
    <nav class="net-toolbar" aria-label="Strumenti di gestione delle reti">
        ${BUTTONS.filter(b => !b.activeOnly || hasActiveNetwork).map(b => `
            <button type="button" class="net-btn ${b.variant}" data-net-action="${esc(b.action)}">
                <span class="material-symbols-rounded">${esc(b.icon)}</span>
                <span>${esc(b.label)}</span>
            </button>
        `).join('')}
    </nav>
`;

export const bindToolbar = (root, handlers) => {
    root.querySelectorAll('[data-net-action]').forEach(button => {
        const action = button.getAttribute('data-net-action');
        if (typeof handlers[action] !== 'function') return;
        button.addEventListener('click', () => handlers[action]());
    });
};

export default renderToolbar;
