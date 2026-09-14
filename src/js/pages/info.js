import { collegaAzioni, INDIRIZZI } from './info/collegamento.js';
import { attivaRivelazione } from './info/animazione.js';
import {
    eroeHtml,
    garanzieHtml,
    piattaformaHtml,
    sicurezzaHtml,
    responsabilitaHtml,
    autoreHtml
} from './info/sezioni.js';

export default {
    render: async (el) => {
        el.innerHTML = `
            <div class="page-container info-pagina">
                ${eroeHtml(INDIRIZZI.PAYPAL)}
                ${garanzieHtml()}
                <div class="info-griglia">
                    ${piattaformaHtml()}
                    ${sicurezzaHtml()}
                </div>
                ${responsabilitaHtml()}
                ${autoreHtml(INDIRIZZI.EMAIL, INDIRIZZI.SITO)}
            </div>`;

        collegaAzioni(el);
        attivaRivelazione(el);
    }
};
