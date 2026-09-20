import { esc } from '../../../../js/shared/html.js';
import { icona3d } from '../../../../js/shared/tinte.js';
import GeneraliView from './views/Generali.js';
import SediView from './views/Sedi.js';
import FiscaliView from './views/Fiscali.js';
import ResponsabiliView from './views/Responsabili.js';
import BrandView from './views/Brand.js';
import CertificazioniView from './views/Certificazioni.js';

const VISTE = [
    { id: 'generali', etichetta: 'Dati Generali', icona: 'apartment', tinta: 'cobalto', vista: GeneraliView, conConfig: true },
    { id: 'fiscali', etichetta: 'Fiscali e Tesoreria', icona: 'receipt_long', tinta: 'verde', vista: FiscaliView, conConfig: true },
    { id: 'responsabili', etichetta: 'Organigramma', icona: 'account_tree', tinta: 'indaco', vista: ResponsabiliView, conConfig: true },
    { id: 'sedi', etichetta: 'Sedi', icona: 'location_city', tinta: 'ruggine', vista: SediView, conConfig: false },
    { id: 'brand', etichetta: 'Brand e Firme', icona: 'brush', tinta: 'violetto', vista: BrandView, conConfig: true },
    { id: 'certificazioni', etichetta: 'Certificazioni', icona: 'verified', tinta: 'ambra', vista: CertificazioniView, conConfig: true }
];

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-schermo fade-in-up k-schermo--compatto" data-tinta="cobalto" data-radice-app>
                    <div class="k-schermo-testa">
                        <div class="k-page-heading">
                            ${icona3d('domain', { dimensione: 'lg', varianti: ['reattiva'] })}
                            <div>
                                <h1 class="k-page-title">Dati Azienda</h1>
                                <p class="k-page-subtitle">Dati anagrafici, fiscali e sedi dell'ente o dell'azienda.</p>
                            </div>
                        </div>
                        <div class="ak-schede" role="tablist" aria-label="Sezioni dei dati azienda">
                            ${VISTE.map((v, i) => `
                                <button type="button" class="ak-scheda" data-vista="${v.id}" data-tinta="${v.tinta}" role="tab" aria-selected="${i === 0}">
                                    ${icona3d(v.icona, { dimensione: 'xs', varianti: ['reattiva'] })}
                                    <span>${esc(v.etichetta)}</span>
                                </button>`).join('')}
                        </div>
                    </div>
                    <div class="k-schermo-corpo" id="dati-azienda-contenuto"></div>
                </div>
            `;

            const contenitore = el.querySelector('#dati-azienda-contenuto');
            const schede = Array.from(el.querySelectorAll('.ak-scheda'));

            let configCache = (await window.electronAPI.readConfig()) || {};

            const saveConfig = async (patch) => {
                const aggiornata = { ...configCache, ...patch };
                const ok = await window.electronAPI.saveConfig(aggiornata);
                if (ok) configCache = aggiornata;
                return ok;
            };

            const apri = async (id) => {
                const scelta = VISTE.find(v => v.id === id) || VISTE[0];
                for (const scheda of schede) scheda.setAttribute('aria-selected', String(scheda.dataset.vista === scelta.id));
                contenitore.dataset.tinta = scelta.tinta;
                contenitore.innerHTML = '<div class="k-loading"><div class="k-spinner"></div><span>Caricamento…</span></div>';
                try {
                    if (scelta.conConfig) await scelta.vista.render(contenitore, configCache, saveConfig);
                    else await scelta.vista.render(contenitore);
                } catch (e) {
                    console.error('[DatiAzienda] Vista non caricata:', e);
                    contenitore.innerHTML = `
                        <div class="k-empty">
                            ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                            <div class="k-empty-title">Sezione non caricata</div>
                            <p class="k-empty-text">${esc(e.message || 'Errore sconosciuto.')}</p>
                        </div>`;
                }
            };

            for (const scheda of schede) {
                scheda.addEventListener('click', () => {
                    if (scheda.getAttribute('aria-selected') === 'true') return;
                    apri(scheda.dataset.vista);
                });
            }

            await apri('generali');
        } catch (e) {
            console.error('[DatiAzienda] Avvio non riuscito:', e);
            el.innerHTML = `
                <div class="k-schermo">
                    <div class="k-empty">
                        ${icona3d('error', { dimensione: 'lg', varianti: ['errore'] })}
                        <div class="k-empty-title">Avvio non riuscito</div>
                        <p class="k-empty-text">${esc(e.message || 'Errore sconosciuto.')}</p>
                    </div>
                </div>`;
        }
    }
};
