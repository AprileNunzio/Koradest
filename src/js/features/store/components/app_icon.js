const APP_DEFAULT_ICONS = {
    'adestio_dental_suite': { icon: 'dentistry', color: '#0d9488', bg: '#ccfbf1' },
    'adestio_business_suite': { icon: 'business_center', color: '#2563eb', bg: '#dbeafe' },
    'adestio_presa_servizio': { icon: 'school', color: '#7c3aed', bg: '#ede9fe' },
    'admin_users': { icon: 'admin_panel_settings', color: '#d97706', bg: '#fef3c7' },
    'user_profile': { icon: 'person', color: '#0284c7', bg: '#e0f2fe' },
    'anagrafica': { icon: 'badge', color: '#059669', bg: '#d1fae5' },
    'settings': { icon: 'settings', color: '#475569', bg: '#f1f5f9' },
    'account_security': { icon: 'security', color: '#dc2626', bg: '#fee2e2' },
    'network_analyzer': { icon: 'hub', color: '#4f46e5', bg: '#e0e7ff' },
    'store': { icon: 'storefront', color: '#0284c7', bg: '#e0f2fe' }
};

export function renderAppIcon(app) {
    try {
        const id = app.id || '';
        const folder = app.folder || id;
        const iconName = app.icon || '';
        const preset = APP_DEFAULT_ICONS[id] || APP_DEFAULT_ICONS[folder];

        if (iconName && (iconName.startsWith('http://') || iconName.startsWith('https://') || iconName.startsWith('data:'))) {
            return `<img src="${iconName}" alt="${app.name || id}" style="width: 100%; height: 100%; object-fit: contain;">`;
        }

        if (iconName && (iconName.endsWith('.png') || iconName.endsWith('.svg') || iconName.endsWith('.jpg') || iconName.endsWith('.webp') || iconName.includes('.'))) {
            const iconUrl = `koradest-app://${folder}/${iconName.startsWith('./') ? iconName.slice(2) : iconName}`;
            const fallbackSymbol = preset?.icon || 'widgets';
            const fallbackColor = preset?.color || 'var(--md-primary)';
            return `<img src="${iconUrl}" alt="${app.name || id}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'material-symbols-rounded\\' style=\\'font-size: 1.6rem; color: ${fallbackColor};\\'>${fallbackSymbol}</span>';">`;
        }

        const symbol = preset?.icon || (iconName && !iconName.includes('.') ? iconName : 'widgets');
        const color = preset?.color || app.color || 'var(--md-primary)';
        return `<span class="material-symbols-rounded" style="font-size: 1.6rem; color: ${color};">${symbol}</span>`;
    } catch (e) {
        return `<span class="material-symbols-rounded" style="font-size: 1.6rem; color: var(--md-primary);">widgets</span>`;
    }
}
