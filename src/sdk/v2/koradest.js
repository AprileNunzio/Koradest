import { richiesta, su, dentroKoradest } from './ponte.js';
import { esc, html, sicuro, formato, valida, HtmlSicuro } from './utilita.js';
import './componenti.js';

// SDK KORADEST v2: l'unico import che serve a un'app.
//   import { koradest, html } from 'koradest-app://sdk/v2/koradest.js';

(function caricaStile() {
    if (document.querySelector('link[data-koradest-sdk]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./koradest.css', import.meta.url).href;
    link.setAttribute('data-koradest-sdk', '');
    document.head.appendChild(link);
})();

let contesto = { app: null, utente: null, ruoli: [], parametri: {} };
let classiBodyApplicate = [];

function applicaTema(tema) {
    if (!tema) return;
    const radice = document.documentElement;
    if (tema.temaHtml) radice.setAttribute('data-theme', tema.temaHtml);
    else radice.removeAttribute('data-theme');
    if (tema.stileHtml) radice.setAttribute('style', tema.stileHtml);
    else radice.removeAttribute('style');
    radice.className = (tema.classiHtml || []).join(' ');
    classiBodyApplicate.forEach(classe => document.body.classList.remove(classe));
    classiBodyApplicate = tema.classiBody || [];
    classiBodyApplicate.forEach(classe => document.body.classList.add(classe));
}

const pronto = richiesta('pronto', {}, { scadenzaMs: 10000 }).then((dati) => {
    contesto = { ...contesto, ...dati };
    applicaTema(dati.tema);
    return contesto;
});
su('tema', applicaTema);

const ui = {
    toast: (messaggio, tipo = 'info') => richiesta('toast', { messaggio: String(messaggio ?? ''), tipo }),
    successo: messaggio => ui.toast(messaggio, 'success'),
    errore: errore => ui.toast((errore && errore.message) || String(errore), 'error'),
    conferma: (opzioni = {}) => richiesta('conferma', opzioni),
    avviso: (opzioni = {}) => richiesta('avviso', opzioni),
    chiedi: (opzioni = {}) => richiesta('chiedi', opzioni)
};

// ---- Router e guscio dell'app -------------------------------------------------

function compila(percorso) {
    const pulito = percorso === '/' ? '/' : String(percorso).replace(/\/+$/, '');
    const nomi = [];
    const sorgente = pulito === '/' ? '^/?$' : `^${pulito.split('/').map((parte) => {
        if (parte.startsWith(':')) {
            nomi.push(parte.slice(1));
            return '([^/]+)';
        }
        return parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/')}/?$`;
    return { regex: new RegExp(sorgente), nomi };
}

function leggiHash() {
    const grezzo = decodeURI(location.hash.replace(/^#/, '')) || '/';
    const [percorso, query = ''] = grezzo.split('?');
    return { percorso: percorso || '/', query: new URLSearchParams(query) };
}

const naviga = (percorso) => {
    location.hash = `#${percorso}`;
};

function haRuolo(ruolo) {
    return [].concat(ruolo).some(r => contesto.ruoli.includes(r));
}

async function avvia({ titolo, icona = 'apps', menu = [], rotte = [], contenitore = document.body } = {}) {
    try {
        await pronto;
    } catch (errore) {
        contenitore.innerHTML = String(html`<k-vuoto icona="extension_off" titolo="App non avviata" testo="${dentroKoradest() ? errore.message : 'Apri questa applicazione da KORADEST.'}"></k-vuoto>`);
        return;
    }

    const nome = titolo || contesto.app.nome;
    document.title = nome;
    const voci = menu.filter(voce => !voce.ruolo || haRuolo(voce.ruolo));
    const tutte = [...menu, ...rotte].map(rotta => ({ ...rotta, ...compila(rotta.percorso) }));
    const conMenu = voci.length > 1;

    contenitore.innerHTML = String(html`
        <div class="k-app${conMenu ? '' : ' k-app--senza-menu'}">
            ${conMenu ? html`
                <nav class="k-app-nav" aria-label="Sezioni di ${nome}">
                    <div class="k-app-brand"><span class="material-symbols-rounded">${icona}</span><span class="k-truncate">${nome}</span></div>
                    <div class="k-app-menu">
                        ${voci.map(voce => html`
                            <a class="k-app-link" href="#${voce.percorso}" data-percorso="${voce.percorso}">
                                <span class="material-symbols-rounded">${voce.icona || 'chevron_right'}</span>
                                <span class="k-truncate">${voce.titolo}</span>
                            </a>`)}
                    </div>
                </nav>` : ''}
            <main class="k-app-main" tabindex="-1"></main>
        </div>`);
    const principale = contenitore.querySelector('.k-app-main');
    let vistaCorrente = null;
    let generazione = 0;

    async function mostra() {
        const mia = ++generazione;
        const { percorso, query } = leggiHash();
        const rotta = tutte.find(r => r.regex.test(percorso));

        contenitore.querySelectorAll('.k-app-link').forEach((link) => {
            const voce = link.dataset.percorso;
            const attivo = voce === '/' ? percorso === '/' : (percorso === voce || percorso.startsWith(`${voce}/`));
            if (attivo) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        if (vistaCorrente && typeof vistaCorrente.smonta === 'function') {
            try {
                await vistaCorrente.smonta();
            } catch (errore) {
                console.error('[KORADEST] Chiusura della vista non riuscita:', errore);
            }
        }
        vistaCorrente = null;

        if (!rotta) {
            principale.innerHTML = String(html`<div class="k-page"><k-vuoto icona="explore_off" titolo="Pagina non trovata" testo="L'indirizzo ${percorso} non esiste in ${nome}."><a class="k-btn k-btn--primary" href="#/">Torna all'inizio</a></k-vuoto></div>`);
            return;
        }
        if (rotta.ruolo && !haRuolo(rotta.ruolo)) {
            principale.innerHTML = String(html`<div class="k-page"><k-vuoto icona="lock" titolo="Accesso non consentito" testo="Per questa sezione serve un ruolo che il tuo account non ha. Chiedilo all'amministratore."></k-vuoto></div>`);
            return;
        }

        principale.innerHTML = '<k-caricamento></k-caricamento>';
        try {
            const modulo = await rotta.vista();
            if (mia !== generazione) return;
            const vista = modulo && (modulo.default || modulo);
            const corrispondenza = percorso.match(rotta.regex) || [];
            const parametri = Object.fromEntries(query);
            rotta.nomi.forEach((nomeParametro, indice) => {
                parametri[nomeParametro] = decodeURIComponent(corrispondenza[indice + 1]);
            });
            principale.innerHTML = '';
            principale.scrollTop = 0;
            if (typeof vista === 'function') {
                const esito = await vista(principale, { parametri, koradest });
                vistaCorrente = esito && typeof esito.smonta === 'function' ? esito : null;
            } else if (vista && typeof vista.render === 'function') {
                await vista.render(principale, { parametri, koradest });
                vistaCorrente = vista;
            } else {
                throw new Error(`La vista di "${rotta.percorso}" non esporta una funzione`);
            }
            principale.focus({ preventScroll: true });
        } catch (errore) {
            if (mia !== generazione) return;
            console.error(errore);
            principale.innerHTML = String(html`
                <div class="k-page">
                    <div class="k-alert k-alert--danger">
                        <span class="material-symbols-rounded">error</span>
                        <div class="k-stack" style="--k-gap: var(--k-space-2);">
                            <strong>Questa pagina non si è aperta</strong>
                            <span>${errore.message}</span>
                            <div><button type="button" class="k-btn k-btn--sm" data-riprova>Riprova</button></div>
                        </div>
                    </div>
                </div>`);
            principale.querySelector('[data-riprova]').addEventListener('click', mostra);
        }
    }

    window.addEventListener('hashchange', mostra);
    if (!location.hash && typeof contesto.parametri.percorso === 'string' && contesto.parametri.percorso.startsWith('/')) {
        history.replaceState(null, '', `#${contesto.parametri.percorso}`);
    }
    await mostra();
}

export const koradest = {
    pronto,
    get app() { return contesto.app; },
    get utente() { return contesto.utente; },
    get ruoli() { return [...contesto.ruoli]; },
    get parametri() { return { ...contesto.parametri }; },
    haRuolo,
    chiama: (azione, payload = {}) => richiesta('chiama', { azione, payload }),
    altraApp: idApp => ({
        chiama: (azione, payload = {}) => richiesta('chiama', { app: idApp, azione, payload })
    }),
    apri: (idApp, parametri = {}) => richiesta('apri', { app: idApp, parametri }),
    ui,
    avvia,
    naviga,
    percorso: () => leggiHash().percorso,
    su,
    formato,
    valida
};

export { html, esc, sicuro, formato, valida, HtmlSicuro };
export default koradest;
