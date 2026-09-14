import { esc, openModal } from './network_dom.js';
import NetworksService from './networks_service.js';

const CREATE_FORM = `
    <div class="net-field">
        <label for="net-create-name">Nome della rete</label>
        <input id="net-create-name" name="name" type="text" maxlength="60" autocomplete="off" placeholder="Es. Studio Rossi, Casa, Scuola Media Verdi" required>
        <small>Nome visibile solo su questa postazione per riconoscere la rete.</small>
    </div>
    <div class="net-field">
        <label for="net-create-min">Nodi minimi per consentire l'accesso</label>
        <input id="net-create-min" name="minNodes" type="number" min="1" max="64" step="1" value="1" required>
        <small>Con valore 1 la rete funziona anche con un solo computer. Con valore superiore a 1 l'accesso viene bloccato finche non sono collegati almeno quel numero di nodi.</small>
    </div>
    <label class="net-check">
        <input name="remember" type="checkbox" checked>
        <span>Memorizza il codice di sicurezza su questo dispositivo, protetto dalle credenziali di Windows.</span>
    </label>
    <div class="net-inline-note">
        <span class="material-symbols-rounded">key</span>
        <span>Al termine riceverai il codice di sicurezza della rete: serve a ogni altro computer per unirsi. Conservalo, non e recuperabile da nessun altro dispositivo.</span>
    </div>
`;

const revealCode = (host, networkCode, onDone) => {
    const modal = openModal(host, {
        id: 'net-modal-code',
        title: 'Codice di sicurezza della rete',
        icon: 'vpn_key',
        confirmLabel: 'Ho annotato il codice',
        cancelLabel: null,
        bodyHtml: `
            <div class="net-inline-note">
                <span class="material-symbols-rounded">priority_high</span>
                <span>Questo codice cifra tutti i dati della rete. Annotalo in un luogo sicuro: senza di esso i dati non sono recuperabili.</span>
            </div>
            <div class="net-reveal">${esc(networkCode)}</div>
        `
    });
    modal.onConfirm(() => {
        modal.close();
        onDone();
    });
};

export const openCreateNetworkModal = (host, { onCreated }) => {
    const modal = openModal(host, {
        id: 'net-modal-create',
        title: 'Crea una nuova rete blockchain',
        icon: 'add_circle',
        confirmLabel: 'Crea rete',
        bodyHtml: CREATE_FORM
    });
    modal.onConfirm(async () => {
        const name = modal.value('name');
        const minNodes = parseInt(modal.value('minNodes'), 10);
        if (!name) {
            modal.setError('Indica un nome per la rete.');
            return;
        }
        if (!Number.isInteger(minNodes) || minNodes < 1 || minNodes > 64) {
            modal.setError('Il numero minimo di nodi deve essere compreso tra 1 e 64.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        const result = await NetworksService.create({ name, minNodes, remember: modal.value('remember') === true });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Creazione non riuscita.');
            return;
        }
        modal.close();
        revealCode(host, result.networkCode, () => onCreated(result));
    });
};

export default openCreateNetworkModal;
