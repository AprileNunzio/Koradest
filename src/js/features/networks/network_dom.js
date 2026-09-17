export { esc } from '../../shared/html.js';
export const formatDate = (timestamp) => {
    if (!timestamp) return 'Mai';
    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
};

export const shortId = (publicId) => (publicId || '').slice(0, 8).toUpperCase();
