import { toast } from '../utils.js';

const report = (scope, message, detail) => {
    const text = `[Renderer/${scope}] ${message}`;
    console.error(text, detail || '');
    if (window.electronAPI && typeof window.electronAPI.logError === 'function') {
        window.electronAPI.logError(text);
    }
};

export const initGlobalErrorHandling = () => {
    window.addEventListener('error', (event) => {
        report('error', event.message, event.error);
        toast('Si e verificato un errore imprevisto nell interfaccia.', 'error');
    });
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        report('promise', (reason && reason.message) || String(reason), reason);
        toast('Operazione non completata: errore imprevisto.', 'error');
    });
};

export default initGlobalErrorHandling;
