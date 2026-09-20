import { Router } from '../../js/utils.js';
import { esc } from '../../js/shared/html.js';
import { icona3d } from '../../js/shared/tinte.js';
import { renderModuliHome } from '../../js/shared/moduli.js';

const APP_ID = 'impostazioni';
const CARTELLA_MODULI = 'apps/impostazioni/subapps';

export default {
    render: async (el, params = {}) => {
        let moduli = [];
        if (window.electronAPI) {
            moduli = await window.electronAPI.getSubAppsRegistry(APP_ID);
        }

        const renderHome = () => renderModuliHome(el, {
            titolo: 'Impostazioni',
            sottotitolo: 'Configurazione del nodo locale, notifiche e credenziali',
            icona: 'settings',
            tinta: 'ardesia',
            moduli: Array.isArray(moduli) ? moduli : [],
            cartellaBase: CARTELLA_MODULI,
            onApri: (folder) => Router.navigate('app_container', { appId: APP_ID, subAppId: folder })
        });

        const renderModulo = async (folder) => {
            const definizione = (Array.isArray(moduli) ? moduli : []).find(m => m.folder === folder);
            el.innerHTML = `
                <div class="k-schermo k-schermo--pieno fade-in-up" data-radice-app>
                    <div class="k-schermo-corpo k-schermo-corpo--fisso" id="subapp-mount-point">
                        <div class="k-loading"><div class="k-spinner" style="--k-spinner-size: 2rem;"></div><span>Apertura del modulo…</span></div>
                    </div>
                </div>
            `;
            const punto = el.querySelector('#subapp-mount-point');
            try {
                const principale = definizione && definizione.main ? definizione.main : 'app.js';
                const modulo = await import(`./subapps/${folder}/${principale}?v=${Date.now()}`);
                if (!modulo || !modulo.default || typeof modulo.default.render !== 'function') {
                    throw new Error('Il modulo non espone un punto di montaggio valido.');
                }
                await modulo.default.render(punto);
            } catch (errore) {
                console.error('[Impostazioni] Apertura del modulo non riuscita:', errore);
                punto.innerHTML = `
                    <div class="k-empty">
                        ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                        <div class="k-empty-title">Modulo non caricato</div>
                        <p class="k-empty-text">${esc(errore.message || 'Errore sconosciuto.')}</p>
                    </div>`;
            }
        };

        if (params.subAppId) await renderModulo(params.subAppId);
        else renderHome();
    }
};
