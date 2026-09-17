import { collegaAzioni, INDIRIZZI } from './collegamento.js';
import { attivaRivelazione } from './animazione.js';
import {
    eroeHtml,
    garanzieHtml,
    piattaformaHtml,
    sicurezzaHtml,
    responsabilitaHtml,
    autoreHtml
} from './sezioni.js';

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
