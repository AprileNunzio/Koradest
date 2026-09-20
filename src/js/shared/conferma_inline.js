import { esc } from './html.js';

const ATTESA_RIMOZIONE_MS = 180;

export function confermaInLinea(ancora, opzioni = {}) {
    const { testo = 'Confermi?', etichetta = 'Conferma', annulla = 'Annulla', pericolosa = true } = opzioni;
    return new Promise((resolve) => {
        if (!ancora || !ancora.parentElement) {
            resolve(false);
            return;
        }
        const esistente = ancora.parentElement.querySelector('.k-conferma[data-in-linea]');
        if (esistente) esistente.remove();

        const barra = document.createElement('span');
        barra.className = 'k-conferma';
        barra.setAttribute('role', 'alertdialog');
        barra.setAttribute('aria-label', testo);
        barra.dataset.inLinea = 'si';
        barra.innerHTML = `
            <span class="k-conferma-testo">${esc(testo)}</span>
            <button type="button" class="k-btn k-btn--sm ${pericolosa ? 'k-btn--danger' : 'k-btn--sezione'}" data-esito="si">${esc(etichetta)}</button>
            <button type="button" class="k-btn k-btn--sm" data-esito="no">${esc(annulla)}</button>
        `;

        const visibilitaPrecedente = ancora.hidden;
        ancora.hidden = true;
        ancora.after(barra);

        const chiudi = (esito) => {
            document.removeEventListener('keydown', allaTastiera, true);
            barra.remove();
            ancora.hidden = visibilitaPrecedente;
            if (!visibilitaPrecedente && typeof ancora.focus === 'function') ancora.focus();
            resolve(esito);
        };

        const allaTastiera = (evento) => {
            if (evento.key !== 'Escape') return;
            evento.preventDefault();
            evento.stopPropagation();
            chiudi(false);
        };

        barra.addEventListener('click', (evento) => {
            const tasto = evento.target.closest('[data-esito]');
            if (!tasto) return;
            evento.preventDefault();
            chiudi(tasto.dataset.esito === 'si');
        });
        document.addEventListener('keydown', allaTastiera, true);
        barra.querySelector('[data-esito="si"]').focus();
    });
}

export function pannelloInLinea(ancora, opzioni = {}) {
    const { titolo = 'Dettagli', corpo = '', testo = null, classe = '' } = opzioni;
    if (!ancora || !ancora.parentElement) return null;
    const esistente = ancora.parentElement.querySelector('.k-pannello-linea');
    if (esistente) {
        esistente.remove();
        ancora.setAttribute('aria-expanded', 'false');
        return null;
    }
    const pannello = document.createElement('div');
    pannello.className = `k-pannello-linea ${classe}`.trim();
    pannello.innerHTML = `
        <div class="k-pannello-linea-testa">
            <span class="k-pannello-linea-titolo">${esc(titolo)}</span>
            <button type="button" class="k-btn k-btn--ghost k-btn--icon k-btn--sm" data-chiudi aria-label="Chiudi">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        <div class="k-pannello-linea-corpo"></div>
    `;
    const corpoEl = pannello.querySelector('.k-pannello-linea-corpo');
    if (testo !== null) {
        const pre = document.createElement('pre');
        pre.className = 'k-console';
        pre.textContent = testo;
        corpoEl.appendChild(pre);
    } else {
        corpoEl.innerHTML = corpo;
    }
    pannello.querySelector('[data-chiudi]').addEventListener('click', () => {
        pannello.remove();
        ancora.setAttribute('aria-expanded', 'false');
        if (typeof ancora.focus === 'function') ancora.focus();
    });
    ancora.after(pannello);
    ancora.setAttribute('aria-expanded', 'true');
    setTimeout(() => pannello.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), ATTESA_RIMOZIONE_MS);
    return pannello;
}
