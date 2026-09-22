export function ottieniContestoVisivo() {
    try {
        const route = window.location.hash ? window.location.hash.replace(/^#/, '') : (window.Router?.currentRoute || 'dashboard');
        const titolo = document.title || 'KORADEST';
        const navTitleEl = document.getElementById('nav-title');
        const navTitle = navTitleEl ? navTitleEl.textContent.trim() : '';

        let dettagliPagina = '';
        const main = document.getElementById('main-content');
        if (main) {
            const inputs = Array.from(main.querySelectorAll('input, select, textarea'))
                .filter(el => el.offsetParent !== null)
                .slice(0, 10)
                .map(el => {
                    const label = el.labels && el.labels[0] ? el.labels[0].textContent.trim() : (el.placeholder || el.name || el.id || '');
                    const val = el.type === 'password' ? '***' : el.value;
                    return label ? `${label}: "${val}"` : null;
                })
                .filter(Boolean);

            const testoEstratto = (main.innerText || '')
                .replace(/\s+/g, ' ')
                .slice(0, 1200)
                .trim();

            dettagliPagina = `\n- Titolo navigazione: ${navTitle || titolo}\n- Percorso: ${route}\n- Dati visibili: ${testoEstratto}`;
            if (inputs.length > 0) {
                dettagliPagina += `\n- Campi a schermo: ${inputs.join('; ')}`;
            }

            const iframe = main.querySelector('iframe');
            if (iframe) {
                dettagliPagina += `\n- Applicazione incorporata (Iframe): ${iframe.title || iframe.src || 'App v2'}`;
            }
        }

        return {
            route,
            titolo,
            dettagliPagina
        };
    } catch (e) {
        return {
            route: 'sconosciuta',
            titolo: 'KORADEST',
            dettagliPagina: 'Impossibile leggere il contesto visivo'
        };
    }
}

export async function ottieniNotizieAvvisi() {
    try {
        const notifiche = [];
        if (window.electronAPI && window.electronAPI.notifications && typeof window.electronAPI.notifications.list === 'function') {
            const userId = sessionStorage.getItem('currentUserId') || '';
            const res = await window.electronAPI.notifications.list({ userId, unreadOnly: true });
            if (res && Array.isArray(res.data) && res.data.length > 0) {
                res.data.slice(0, 5).forEach(n => {
                    notifiche.push(`[Notifica] ${n.title || n.oggetto}: ${n.message || n.corpo}`);
                });
            }
        }
        return notifiche;
    } catch (e) {
        return [];
    }
}
