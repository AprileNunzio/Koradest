import { esc } from './html.js';
import { icona3d, zona as descriviZona, ZONE } from './tinte.js';

const chiaveValida = /^[a-z][a-z0-9_-]{0,39}$/;

const normalizza = (passi) => (Array.isArray(passi) ? passi : [])
    .filter(passo => passo && chiaveValida.test(String(passo.id)))
    .map((passo, indice) => {
        const riferimento = descriviZona(passo.zona);
        return {
            id: String(passo.id),
            indice,
            etichetta: String(passo.etichetta || riferimento.etichetta),
            titolo: String(passo.titolo || passo.etichetta || riferimento.etichetta),
            nota: passo.nota ? String(passo.nota) : '',
            icona: passo.icona || riferimento.icona,
            zona: passo.zona && Object.prototype.hasOwnProperty.call(ZONE, passo.zona) ? String(passo.zona) : null,
            tinta: passo.tinta || null,
            corpo: typeof passo.corpo === 'string' ? passo.corpo : ''
        };
    });

const attributoTinta = (passo) => {
    if (passo.zona) return ` data-zona="${esc(passo.zona)}"`;
    if (passo.tinta) return ` data-tinta="${esc(passo.tinta)}"`;
    return '';
};

const guidaHtml = (idProcedura, passi) => passi.map(passo => `
    <li>
        <button type="button" class="k-passo-tasto" id="${esc(idProcedura)}-tasto-${esc(passo.id)}"
            data-passo="${esc(passo.id)}" data-stato="atteso"${attributoTinta(passo)}
            role="tab" aria-controls="${esc(idProcedura)}-passo-${esc(passo.id)}" aria-selected="false" tabindex="-1">
            ${icona3d(passo.icona, { dimensione: 'xs', varianti: ['reattiva'] })}
            <span class="k-passo-tasto-numero">${passo.indice + 1}</span>
            <span class="k-passo-tasto-etichetta">${esc(passo.etichetta)}</span>
        </button>
    </li>
`).join('');

const scenaHtml = (idProcedura, passi) => passi.map(passo => `
    <section class="k-passo" id="${esc(idProcedura)}-passo-${esc(passo.id)}" data-passo="${esc(passo.id)}"
        data-attivo="no"${attributoTinta(passo)} role="tabpanel"
        aria-labelledby="${esc(idProcedura)}-tasto-${esc(passo.id)}">
        <header class="k-passo-intestazione">
            ${icona3d(passo.icona, { dimensione: 'sm' })}
            <div>
                <h3 class="k-passo-titolo">${esc(passo.titolo)}</h3>
                ${passo.nota ? `<p class="k-passo-nota">${esc(passo.nota)}</p>` : ''}
            </div>
        </header>
        ${passo.corpo}
    </section>
`).join('');

export function creaProcedura(contenitore, configurazione = {}) {
    const {
        id = 'procedura',
        passi: passiGrezzi = [],
        etichettaFine = 'Salva',
        iconaFine = 'save',
        etichettaAnnulla = null,
        onValida = null,
        onFine = null,
        onCambio = null,
        onAnnulla = null
    } = configurazione;

    const idProcedura = chiaveValida.test(String(id)) ? String(id) : 'procedura';
    const passi = normalizza(passiGrezzi);
    if (!contenitore || passi.length === 0) return null;

    contenitore.innerHTML = `
        <div class="k-passi" data-procedura="${esc(idProcedura)}">
            <ol class="k-passi-guida" role="tablist" aria-label="Passaggi della compilazione">${guidaHtml(idProcedura, passi)}</ol>
            <div class="k-passi-avanzamento">
                <span data-ruolo="contatore">Passo 1 di ${passi.length}</span>
                <div class="k-progress"><span data-ruolo="barra" style="width: 0%;"></span></div>
            </div>
            <div class="k-passi-scena">${scenaHtml(idProcedura, passi)}</div>
            <div class="k-passi-comandi">
                ${etichettaAnnulla ? `<button type="button" class="k-btn k-btn--ghost" data-ruolo="annulla">${esc(etichettaAnnulla)}</button>` : ''}
                <span class="k-passi-scorciatoia">
                    <span class="k-kbd">Alt</span><span class="k-kbd">&larr;</span>
                    <span class="k-kbd">&rarr;</span>
                    <span>per spostarti</span>
                </span>
                <span class="k-spinta"></span>
                <button type="button" class="k-btn" data-ruolo="indietro" disabled>
                    <span class="material-symbols-rounded">arrow_back</span>Indietro
                </button>
                <button type="button" class="k-btn k-btn--sezione" data-ruolo="avanti">
                    Avanti<span class="material-symbols-rounded">arrow_forward</span>
                </button>
                <button type="submit" class="k-btn k-btn--sezione" data-ruolo="fine" hidden>
                    <span class="material-symbols-rounded">${esc(iconaFine)}</span>${esc(etichettaFine)}
                </button>
            </div>
        </div>
    `;

    const radice = contenitore.querySelector('.k-passi');
    const tasti = new Map();
    const scene = new Map();
    for (const passo of passi) {
        tasti.set(passo.id, radice.querySelector(`.k-passo-tasto[data-passo="${passo.id}"]`));
        scene.set(passo.id, radice.querySelector(`.k-passo[data-passo="${passo.id}"]`));
    }
    const contatore = radice.querySelector('[data-ruolo="contatore"]');
    const barra = radice.querySelector('[data-ruolo="barra"]');
    const tastoIndietro = radice.querySelector('[data-ruolo="indietro"]');
    const tastoAvanti = radice.querySelector('[data-ruolo="avanti"]');
    const tastoFine = radice.querySelector('[data-ruolo="fine"]');
    const tastoAnnulla = radice.querySelector('[data-ruolo="annulla"]');

    let corrente = 0;
    const visitati = new Set();

    const campiDi = (scena) => Array.from(scena.querySelectorAll('input, select, textarea'))
        .filter(campo => !campo.disabled && campo.type !== 'hidden');

    const pulisciSegni = (scena) => {
        for (const campo of campiDi(scena)) campo.removeAttribute('aria-invalid');
    };

    const validaPasso = (indice) => {
        const passo = passi[indice];
        const scena = scene.get(passo.id);
        pulisciSegni(scena);
        for (const campo of campiDi(scena)) {
            if (campo.checkValidity()) continue;
            campo.setAttribute('aria-invalid', 'true');
            campo.focus();
            return campo.validationMessage || 'Controlla questo campo.';
        }
        if (typeof onValida === 'function') {
            const esito = onValida(passo.id, scena);
            if (typeof esito === 'string' && esito) return esito;
        }
        return null;
    };

    const aggiornaTasti = () => {
        passi.forEach((passo, indice) => {
            const tasto = tasti.get(passo.id);
            const attivo = indice === corrente;
            tasto.setAttribute('aria-selected', attivo ? 'true' : 'false');
            tasto.tabIndex = attivo ? 0 : -1;
            if (attivo) tasto.setAttribute('aria-current', 'step');
            else tasto.removeAttribute('aria-current');
            if (tasto.dataset.stato !== 'errore') {
                tasto.dataset.stato = visitati.has(passo.id) && !attivo ? 'fatto' : 'atteso';
            }
        });
    };

    const mostra = (indice) => {
        passi.forEach((passo, posizione) => {
            scene.get(passo.id).dataset.attivo = posizione === indice ? 'si' : 'no';
        });
        const ultimo = indice === passi.length - 1;
        contatore.textContent = `Passo ${indice + 1} di ${passi.length}`;
        barra.style.width = `${Math.round(((indice + 1) / passi.length) * 100)}%`;
        tastoIndietro.disabled = indice === 0;
        tastoAvanti.hidden = ultimo;
        tastoFine.hidden = !ultimo;
        radice.dataset.passoAttivo = passi[indice].id;
        aggiornaTasti();
        if (typeof onCambio === 'function') onCambio(passi[indice].id, scene.get(passi[indice].id));
    };

    const vaiA = (riferimento, { valida = true } = {}) => {
        const indice = typeof riferimento === 'number'
            ? riferimento
            : passi.findIndex(passo => passo.id === riferimento);
        if (indice < 0 || indice >= passi.length || indice === corrente) return true;
        if (valida && indice > corrente) {
            for (let posizione = corrente; posizione < indice; posizione += 1) {
                const problema = validaPasso(posizione);
                if (problema) {
                    tasti.get(passi[posizione].id).dataset.stato = 'errore';
                    corrente = posizione;
                    mostra(corrente);
                    return problema;
                }
                tasti.get(passi[posizione].id).dataset.stato = 'fatto';
                visitati.add(passi[posizione].id);
            }
        }
        corrente = indice;
        mostra(corrente);
        const primo = campiDi(scene.get(passi[corrente].id))[0];
        if (primo) primo.focus({ preventScroll: true });
        return true;
    };

    const avanti = () => {
        const problema = validaPasso(corrente);
        if (problema) {
            tasti.get(passi[corrente].id).dataset.stato = 'errore';
            return problema;
        }
        tasti.get(passi[corrente].id).dataset.stato = 'fatto';
        visitati.add(passi[corrente].id);
        if (corrente === passi.length - 1) return true;
        return vaiA(corrente + 1, { valida: false });
    };

    const indietro = () => (corrente > 0 ? vaiA(corrente - 1, { valida: false }) : true);

    const validaTutto = () => {
        for (let indice = 0; indice < passi.length; indice += 1) {
            const problema = validaPasso(indice);
            if (problema) {
                tasti.get(passi[indice].id).dataset.stato = 'errore';
                corrente = indice;
                mostra(corrente);
                return problema;
            }
            tasti.get(passi[indice].id).dataset.stato = 'fatto';
            visitati.add(passi[indice].id);
        }
        return null;
    };

    const concludi = async () => {
        const problema = validaTutto();
        if (problema) return problema;
        if (typeof onFine === 'function') await onFine();
        return null;
    };

    for (const [idPasso, tasto] of tasti) {
        tasto.addEventListener('click', () => vaiA(idPasso));
    }
    tastoIndietro.addEventListener('click', indietro);
    tastoAvanti.addEventListener('click', avanti);
    tastoFine.addEventListener('click', (evento) => {
        if (tastoFine.form) return;
        evento.preventDefault();
        concludi();
    });
    if (tastoAnnulla && typeof onAnnulla === 'function') tastoAnnulla.addEventListener('click', onAnnulla);

    const allaTastiera = (evento) => {
        if (evento.altKey && evento.key === 'ArrowRight') {
            evento.preventDefault();
            avanti();
            return;
        }
        if (evento.altKey && evento.key === 'ArrowLeft') {
            evento.preventDefault();
            indietro();
            return;
        }
        if (evento.key !== 'Enter' || evento.ctrlKey || evento.metaKey) return;
        const bersaglio = evento.target;
        if (!(bersaglio instanceof HTMLElement)) return;
        if (bersaglio.tagName === 'TEXTAREA' || bersaglio.tagName === 'BUTTON') return;
        if (corrente === passi.length - 1) return;
        evento.preventDefault();
        avanti();
    };
    radice.addEventListener('keydown', allaTastiera);

    mostra(0);

    return {
        radice,
        vaiA,
        avanti,
        indietro,
        concludi,
        validaTutto,
        passoAttivo: () => passi[corrente].id,
        scenaDi: (idPasso) => scene.get(idPasso) || null,
        distruggi: () => {
            radice.removeEventListener('keydown', allaTastiera);
            contenitore.innerHTML = '';
        }
    };
}

export default creaProcedura;
