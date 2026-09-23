export const STATI = Object.freeze({ OK: 'ok', ERRORE: 'errore', SALVATAGGIO: 'salvataggio', ATTESA: 'attesa' });

const campoDi = (radice, nome) => radice.querySelector(`[data-campo="${CSS.escape(nome)}"]`);

export function impostaStato(radice, nome, stato = null, messaggio = '') {
    const campo = campoDi(radice, nome);
    if (!campo) return;
    if (stato) campo.dataset.stato = stato;
    else delete campo.dataset.stato;
    const avviso = campo.querySelector('[data-messaggio]');
    avviso.textContent = messaggio;
    avviso.hidden = !messaggio;
    avviso.setAttribute('role', stato === STATI.ERRORE ? 'alert' : 'status');
    const controllo = campo.querySelector('[name]');
    if (controllo) controllo.toggleAttribute('aria-invalid', stato === STATI.ERRORE);
}

export function statoDi(radice, nome) {
    const campo = campoDi(radice, nome);
    return campo ? campo.dataset.stato || null : null;
}

export function abilitaStorico(radice, abilitato) {
    radice.querySelectorAll('[data-storico]').forEach((pulsante) => {
        pulsante.disabled = !abilitato;
    });
}
