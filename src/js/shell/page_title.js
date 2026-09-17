import { PAGE_TITLES } from './pages_registry.js';

const EVENTO_TITOLO = 'shell:titolo';
const LUNGHEZZA_MASSIMA = 80;

let sovrascrittura = null;

const scrivi = (testo) => {
    const nodo = document.getElementById('nav-title');
    if (nodo) nodo.textContent = testo;
};

const normalizza = (valore) => String(valore ?? '').replace(/\s+/g, ' ').trim().slice(0, LUNGHEZZA_MASSIMA);

const titoloDi = (pagina) => (
    sovrascrittura && sovrascrittura.pagina === pagina
        ? sovrascrittura.testo
        : (PAGE_TITLES[pagina] || '')
);

export const impostaTitoloPagina = (pagina, testo) => {
    const pulito = normalizza(testo);
    if (!pagina || !pulito) return;
    window.dispatchEvent(new CustomEvent(EVENTO_TITOLO, { detail: { pagina, testo: pulito } }));
};

export const initPageTitle = () => {
    window.addEventListener(EVENTO_TITOLO, (evento) => {
        const dettaglio = evento.detail || {};
        const testo = normalizza(dettaglio.testo);
        if (!dettaglio.pagina || !testo) return;
        sovrascrittura = { pagina: dettaglio.pagina, testo };
        scrivi(testo);
    });

    window.addEventListener('router:navigated', (evento) => {
        const pagina = evento.detail.pageName;
        if (sovrascrittura && sovrascrittura.pagina !== pagina) sovrascrittura = null;
        scrivi(titoloDi(pagina));
    });
};

export default initPageTitle;
