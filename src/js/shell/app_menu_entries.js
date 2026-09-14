export const SEPARATOR = { type: 'separator' };

export const MENU_ENTRIES = [
    {
        id: 'menu-btn-networks',
        icon: 'hub',
        label: 'Cambia rete blockchain',
        hint: 'Chiude la rete attiva e torna alla scelta delle reti',
        visible: (ctx) => ctx.hasActiveNetwork
    },
    {
        id: 'menu-btn-nodes',
        icon: 'lan',
        label: 'Gestione nodi',
        hint: 'Stato e diagnostica dei nodi della rete attiva',
        visible: (ctx) => ctx.hasActiveNetwork && ctx.isLoggedIn
    },
    {
        id: 'menu-btn-store',
        icon: 'storefront',
        label: 'App Store',
        hint: 'Installa e aggiorna le applicazioni della rete',
        visible: (ctx) => ctx.hasActiveNetwork && ctx.isLoggedIn
    },
    SEPARATOR,
    {
        id: 'menu-btn-security',
        icon: 'shield_person',
        label: 'Sicurezza account',
        hint: 'PIN, password, 2FA e passkey',
        visible: (ctx) => ctx.isLoggedIn
    },
    {
        id: 'menu-btn-logout',
        icon: 'logout',
        label: 'Esci dall account',
        hint: 'Termina la sessione utente e resta nella rete',
        visible: (ctx) => ctx.isLoggedIn
    },
    SEPARATOR,
    {
        id: 'menu-btn-updates',
        icon: 'update',
        label: 'Controlla aggiornamenti',
        hint: 'Verifica se esiste una versione piu recente',
        visible: () => true
    },
    {
        id: 'menu-btn-github',
        icon: 'code',
        label: 'Pagina del progetto',
        hint: 'Apre il repository nel browser di sistema',
        visible: () => true
    },
    {
        id: 'menu-btn-about',
        icon: 'info',
        label: 'Informazioni su KORADEST',
        hint: 'Versione, rete attiva e stato del nodo',
        visible: () => true
    },
    SEPARATOR,
    {
        id: 'menu-btn-devtools',
        icon: 'bug_report',
        label: 'Strumenti sviluppatore',
        hint: 'Riservato agli amministratori della rete',
        visible: (ctx) => ctx.isSuperadmin || ctx.isDevBuild
    }
];

export default MENU_ENTRIES;
