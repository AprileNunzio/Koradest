// Dialog del core: sostituiscono alert, confirm e prompt nativi in tutta l'interfaccia.
// Ogni funzione restituisce una Promise e chiude con Esc o con un clic fuori dal riquadro.

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paragrafi = (testo) => String(testo ?? '')
    .split(/\n+/)
    .filter(Boolean)
    .map(riga => `<p>${esc(riga)}</p>`)
    .join('');

const TONI = {
    info: { icona: 'info', sfondo: 'var(--md-primary-container)', colore: 'var(--md-primary)' },
    pericolo: { icona: 'warning', sfondo: 'var(--md-error-container)', colore: 'var(--md-error)' },
    successo: { icona: 'check_circle', sfondo: 'var(--md-success-container)', colore: 'var(--md-success)' }
};

function apri({ titolo, testo, icona, tono = 'info', pulsanti, campo = null }) {
    return new Promise((resolve) => {
        const precedente = document.activeElement;
        const stile = TONI[tono] || TONI.info;
        const sfondo = document.createElement('div');
        sfondo.className = 'k-dialog-backdrop';
        sfondo.innerHTML = `
            <div class="k-dialog" role="${tono === 'pericolo' ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="k-dialogo-titolo">
                <div class="k-dialog-header">
                    <span class="k-page-icon material-symbols-rounded" style="background: ${stile.sfondo}; color: ${stile.colore};">${esc(icona || stile.icona)}</span>
                    <h2 id="k-dialogo-titolo" class="k-dialog-title" style="align-self: center;">${esc(titolo)}</h2>
                </div>
                <div class="k-dialog-body k-stack" style="--k-gap: var(--k-space-2);">
                    ${paragrafi(testo)}
                    ${campo ? `
                        <div class="k-field">
                            ${campo.etichetta ? `<label class="k-label" for="k-dialogo-campo">${esc(campo.etichetta)}</label>` : ''}
                            <input id="k-dialogo-campo" class="k-input" type="${esc(campo.tipo || 'text')}" value="${esc(campo.valore || '')}" placeholder="${esc(campo.placeholder || '')}" autocomplete="off">
                        </div>` : ''}
                </div>
                <div class="k-dialog-footer">
                    ${pulsanti.map((p, i) => `<button type="button" class="k-btn ${p.variante || ''}" data-indice="${i}">${esc(p.etichetta)}</button>`).join('')}
                </div>
            </div>`;

        const input = () => sfondo.querySelector('#k-dialogo-campo');
        const chiudi = (valore) => {
            document.removeEventListener('keydown', tasti, true);
            sfondo.remove();
            if (precedente && typeof precedente.focus === 'function') precedente.focus();
            resolve(valore);
        };
        const esito = (indice) => {
            const pulsante = pulsanti[indice];
            chiudi(typeof pulsante.valore === 'function' ? pulsante.valore(input()) : pulsante.valore);
        };
        const tasti = (evento) => {
            if (evento.key === 'Escape') {
                evento.preventDefault();
                chiudi(pulsanti[0].valore instanceof Function ? null : pulsanti[0].valore);
            } else if (evento.key === 'Enter' && campo && document.activeElement === input()) {
                evento.preventDefault();
                esito(pulsanti.length - 1);
            }
        };

        sfondo.addEventListener('click', (evento) => {
            if (evento.target === sfondo) return chiudi(pulsanti[0].valore instanceof Function ? null : pulsanti[0].valore);
            const pulsante = evento.target.closest('[data-indice]');
            if (pulsante) esito(Number(pulsante.dataset.indice));
        });
        document.addEventListener('keydown', tasti, true);
        document.body.appendChild(sfondo);
        const focus = campo ? input() : sfondo.querySelector(`[data-indice="${tono === 'pericolo' ? 0 : pulsanti.length - 1}"]`);
        if (focus) setTimeout(() => focus.focus(), 30);
    });
}

export function conferma({ titolo = 'Confermi?', testo = '', etichetta = 'Conferma', annulla = 'Annulla', pericolosa = false, icona } = {}) {
    return apri({
        titolo,
        testo,
        icona,
        tono: pericolosa ? 'pericolo' : 'info',
        pulsanti: [
            { etichetta: annulla, variante: 'k-btn--ghost', valore: false },
            { etichetta, variante: pericolosa ? 'k-btn--danger' : 'k-btn--primary', valore: true }
        ]
    });
}

export function avviso({ titolo = 'Avviso', testo = '', etichetta = 'Ho capito', tono = 'info', icona } = {}) {
    return apri({
        titolo,
        testo,
        icona,
        tono,
        pulsanti: [{ etichetta, variante: 'k-btn--primary', valore: undefined }]
    });
}

export function chiedi({ titolo = 'Inserisci un valore', testo = '', etichetta = 'Conferma', annulla = 'Annulla', campo = {}, icona } = {}) {
    return apri({
        titolo,
        testo,
        icona: icona || 'edit',
        campo,
        pulsanti: [
            { etichetta: annulla, variante: 'k-btn--ghost', valore: () => null },
            { etichetta, variante: 'k-btn--primary', valore: (input) => (input ? input.value.trim() : '') }
        ]
    });
}
