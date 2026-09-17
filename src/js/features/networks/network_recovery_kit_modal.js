import { esc } from '../../shared/html.js';
import { openModal } from '../../shared/modale.js';
import NetworksService from './networks_service.js';

const FORM = `
    <div class="net-inline-note">
        <span class="material-symbols-rounded">safety_check</span>
        <span>Il kit divide il codice di rete in piu quote. Servono solo alcune di esse per ricostruirlo: distribuiscile a persone o luoghi diversi. Una singola quota non rivela nulla.</span>
    </div>
    <div class="net-field">
        <label for="net-kit-total">Quote da generare</label>
        <input id="net-kit-total" name="totalShares" type="number" min="2" max="12" step="1" value="5" required>
    </div>
    <div class="net-field">
        <label for="net-kit-threshold">Quote necessarie per il recupero</label>
        <input id="net-kit-threshold" name="threshold" type="number" min="2" max="12" step="1" value="3" required>
        <small>Con 5 quote e soglia 3 puoi perderne due senza conseguenze, e servono tre persone d'accordo per ricostruire il codice.</small>
    </div>
    <div class="net-field">
        <label for="net-kit-cred">Conferma con il tuo PIN o password</label>
        <input id="net-kit-cred" name="credential" type="password" autocomplete="current-password" required>
    </div>
`;

const renderKit = (host, kit) => {
    const righe = kit.shares.map((quota, indice) => `
        <div class="net-kit-share">
            <span class="net-kit-num">Quota ${indice + 1} di ${kit.totalShares}</span>
            <code>${esc(quota)}</code>
        </div>
    `).join('');
    const modal = openModal(host, {
        id: 'net-modal-kit-result',
        title: 'Kit di recupero generato',
        icon: 'safety_check',
        confirmLabel: 'Ho distribuito le quote',
        cancelLabel: null,
        bodyHtml: `
            <div class="net-inline-note">
                <span class="material-symbols-rounded">priority_high</span>
                <span>Servono <strong>${esc(kit.threshold)}</strong> quote qualsiasi su <strong>${esc(kit.totalShares)}</strong> per ricostruire il codice di <strong>${esc(kit.networkName || 'questa rete')}</strong>. Conservale in luoghi separati: se le tieni tutte insieme non hai aumentato la sicurezza.</span>
            </div>
            <div class="net-kit-list">${righe}</div>
            <div class="net-inline-note">
                <span class="material-symbols-rounded">print</span>
                <span>Queste quote non verranno mostrate di nuovo. Copiale o stampale ora.</span>
            </div>
        `
    });
    const azioni = document.createElement('div');
    azioni.style.cssText = 'display:flex;gap:0.6rem;flex-wrap:wrap;';
    azioni.innerHTML = `
        <button type="button" class="net-btn" id="net-kit-copy"><span class="material-symbols-rounded">content_copy</span><span>Copia tutte le quote</span></button>
        <button type="button" class="net-btn" id="net-kit-print"><span class="material-symbols-rounded">print</span><span>Stampa</span></button>
    `;
    modal.overlay.querySelector('.net-modal-body').appendChild(azioni);
    azioni.querySelector('#net-kit-copy').addEventListener('click', async () => {
        const testo = [
            `KORADEST - Kit di recupero rete "${kit.networkName || ''}"`,
            `Generato il ${new Date(kit.createdAt).toLocaleString('it-IT')}`,
            `Servono ${kit.threshold} quote su ${kit.totalShares}.`,
            '',
            ...kit.shares.map((q, i) => `Quota ${i + 1}: ${q}`)
        ].join('\n');
        await navigator.clipboard.writeText(testo);
        const bottone = azioni.querySelector('#net-kit-copy');
        bottone.querySelector('span:last-child').textContent = 'Copiate negli appunti';
    });
    azioni.querySelector('#net-kit-print').addEventListener('click', () => window.print());
    modal.onConfirm(() => modal.close());
};

export const openRecoveryKitModal = (host) => {
    const modal = openModal(host, {
        id: 'net-modal-kit',
        title: 'Genera un kit di recupero',
        icon: 'safety_check',
        confirmLabel: 'Genera il kit',
        bodyHtml: FORM
    });
    modal.onConfirm(async () => {
        const totalShares = parseInt(modal.value('totalShares'), 10);
        const threshold = parseInt(modal.value('threshold'), 10);
        const credential = modal.value('credential');
        if (!Number.isInteger(totalShares) || totalShares < 2 || totalShares > 12) {
            modal.setError('Le quote da generare devono essere tra 2 e 12.');
            return;
        }
        if (!Number.isInteger(threshold) || threshold < 2 || threshold > totalShares) {
            modal.setError('Le quote necessarie devono essere tra 2 e il numero di quote generate.');
            return;
        }
        if (!credential) {
            modal.setError('Inserisci il PIN o la password per confermare.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        const result = await NetworksService.createRecoveryKit({ totalShares, threshold, credential });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Generazione non riuscita.');
            return;
        }
        modal.close();
        renderKit(host, result.kit);
    });
};

export default openRecoveryKitModal;
