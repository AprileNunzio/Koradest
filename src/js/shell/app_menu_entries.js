export const SEPARATOR = { type: 'separator' };

export const MENU_ENTRIES = [
    {
        id: 'menu-btn-updates',
        icon: 'update',
        label: 'Controlla aggiornamenti',
        visible: () => true
    },
    {
        id: 'menu-btn-about',
        icon: 'info',
        label: 'Informazioni su KORADEST',
        visible: () => true
    },
    {
        id: 'menu-btn-devtools',
        icon: 'bug_report',
        label: 'Strumenti sviluppatore',
        visible: (ctx) => ctx.isSuperadmin || ctx.isDevBuild
    },
    SEPARATOR,
    {
        id: 'menu-btn-logout',
        icon: 'logout',
        label: 'Esci dall account',
        visible: (ctx) => ctx.isLoggedIn
    }
];

export default MENU_ENTRIES;
