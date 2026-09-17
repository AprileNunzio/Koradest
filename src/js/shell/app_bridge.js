import { toast, conferma, avviso, chiedi, Router } from '../utils.js';

// Lato core del ponte verso le app v2. L'app vive in un iframe sandbox senza accesso
// a electronAPI: ogni richiesta passa da qui, con l'identita dell'app decisa dal core.

const CANALE = 'koradest';
const TIPI_TOAST = new Set(['info', 'success', 'warning', 'error']);
const ATTESA_AVVIO_MS = 15000;

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const stringa = (valore, massimo = 500) => (typeof valore === 'string' ? valore.slice(0, massimo) : undefined);

function soloPrimitivi(oggetto) {
    if (!oggetto || typeof oggetto !== 'object') return {};
    return Object.fromEntries(Object.entries(oggetto)
        .filter(([, valore]) => ['string', 'number', 'boolean'].includes(typeof valore)));
}

function opzioniDialogo(o = {}) {
    return {
        titolo: stringa(o.titolo, 200),
        testo: stringa(o.testo, 2000),
        etichetta: stringa(o.etichetta, 60),
        annulla: stringa(o.annulla, 60),
        pericolosa: o.pericolosa === true,
        icona: typeof o.icona === 'string' && /^[a-z0-9_]{1,40}$/.test(o.icona) ? o.icona : undefined,
        tono: o.tono === 'pericolo' ? 'pericolo' : 'info'
    };
}

function statoTema() {
    return {
        temaHtml: document.documentElement.getAttribute('data-theme'),
        stileHtml: document.documentElement.getAttribute('style'),
        classiHtml: [...document.documentElement.classList],
        classiBody: [...document.body.classList]
    };
}

export function montaAppIsolata(contenitore, manifest, parametri = {}) {
    const appId = manifest.id;
    const cartella = manifest.folder || appId;
    const ingresso = String(manifest.main || 'index.html').replace(/^\.?\//, '');
    const parametriApp = soloPrimitivi(parametri);
    delete parametriApp.appId;
    delete parametriApp.subAppId;
    const utenteId = () => sessionStorage.getItem('currentUserId') || null;

    contenitore.innerHTML = `
        <div style="position: relative; height: 100%; width: 100%;">
            <div class="k-loading" data-avvio style="position: absolute; inset: 0;">
                <div class="k-spinner" style="--k-spinner-size: 2rem;"></div>
                <span>Avvio di ${esc(manifest.name || appId)}...</span>
            </div>
        </div>`;
    const involucro = contenitore.firstElementChild;
    const avvio = involucro.querySelector('[data-avvio]');

    const frame = document.createElement('iframe');
    frame.title = manifest.name || appId;
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.style.cssText = 'display: block; width: 100%; height: 100%; border: 0; background: transparent; visibility: hidden;';
    const versioneApp = manifest.version || '0';
    const tokenSessione = Date.now();
    frame.src = `koradest-app://${encodeURIComponent(cartella)}/${ingresso.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(versioneApp)}&_t=${tokenSessione}`;
    involucro.appendChild(frame);

    let scadenzaAvvio = null;
    const mostra = () => {
        clearTimeout(scadenzaAvvio);
        frame.style.visibility = 'visible';
        avvio.remove();
    };
    scadenzaAvvio = setTimeout(() => {
        mostra();
        console.warn(`[AppBridge] ${appId} non ha contattato KORADEST entro ${ATTESA_AVVIO_MS / 1000} secondi: usa l'SDK v2?`);
    }, ATTESA_AVVIO_MS);

    const invia = (corpo) => {
        if (frame.contentWindow) frame.contentWindow.postMessage({ canale: CANALE, ...corpo }, '*');
    };

    const ruoliUtente = async () => {
        const userId = utenteId();
        const rbac = window.electronAPI && window.electronAPI.rbac;
        if (!userId || !rbac || typeof rbac.getEffectiveUserPermissions !== 'function') return [];
        const permessi = await rbac.getEffectiveUserPermissions(userId);
        const elenco = Array.isArray(permessi) ? permessi : [];
        const dichiarati = (manifest.rbacPermissions || manifest.roles || []).map(r => r.id);
        if (elenco.includes('*') || elenco.includes(`${appId}:*`)) return dichiarati;
        return dichiarati.filter(ruolo => elenco.includes(`${appId}:${ruolo}`));
    };

    const metodi = {
        pronto: async () => {
            mostra();
            const utente = window.currentUser || {};
            return {
                app: { id: appId, nome: manifest.name || appId, versione: manifest.version || null },
                utente: utenteId() ? { id: utenteId(), nome: utente.username || utente.nome || null } : null,
                ruoli: await ruoliUtente(),
                parametri: parametriApp,
                tema: statoTema()
            };
        },
        chiama: async ({ azione, payload, app } = {}) => {
            if (typeof azione !== 'string' || !azione) throw new Error('Azione non indicata');
            if (app !== undefined && typeof app !== 'string') throw new Error('Applicazione di destinazione non valida');
            const risposta = await window.koradestNative.callAppApi({
                sourceApp: appId,
                targetApp: app || appId,
                action: azione,
                payload: payload === undefined ? {} : payload,
                contesto: utenteId() ? { userId: utenteId() } : null
            });
            if (!risposta || risposta.success !== true) {
                throw new Error((risposta && risposta.error) || 'Operazione non riuscita');
            }
            return risposta.data;
        },
        toast: ({ messaggio, tipo } = {}) => {
            toast(stringa(messaggio, 300) || '', TIPI_TOAST.has(tipo) ? tipo : 'info');
            return true;
        },
        conferma: (opzioni) => conferma(opzioniDialogo(opzioni)),
        avviso: async (opzioni) => {
            await avviso(opzioniDialogo(opzioni));
            return true;
        },
        chiedi: (opzioni = {}) => chiedi({ ...opzioniDialogo(opzioni), campo: soloPrimitivi(opzioni.campo) }),
        apri: ({ app, parametri: parametriDestinazione } = {}) => {
            if (app === 'dashboard') {
                Router.navigate('dashboard');
                return true;
            }
            if (typeof app !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(app)) throw new Error('Applicazione da aprire non valida');
            Router.navigate('app_container', { ...soloPrimitivi(parametriDestinazione), appId: app });
            return true;
        }
    };

    const ricevi = async (evento) => {
        const messaggio = evento.data;
        if (!messaggio || messaggio.canale !== CANALE || typeof messaggio.id !== 'string' || typeof messaggio.metodo !== 'string') return;
        if (evento.source !== frame.contentWindow && evento.source !== window) return;
        const metodo = Object.prototype.hasOwnProperty.call(metodi, messaggio.metodo) ? metodi[messaggio.metodo] : null;
        try {
            if (!metodo) throw new Error(`Funzione KORADEST sconosciuta: ${messaggio.metodo}`);
            const dati = await metodo(messaggio.parametri || {});
            invia({ id: messaggio.id, esito: true, dati });
        } catch (errore) {
            invia({ id: messaggio.id, esito: false, errore: (errore && errore.message) || String(errore) });
        }
    };
    window.addEventListener('message', ricevi);

    const osservatore = new MutationObserver(() => invia({ evento: 'tema', dati: statoTema() }));
    osservatore.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    osservatore.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return {
        frame,
        distruggi: () => {
            clearTimeout(scadenzaAvvio);
            window.removeEventListener('message', ricevi);
            osservatore.disconnect();
            try {
                frame.src = 'about:blank';
            } catch (_) {}
            frame.remove();
        }
    };
}
