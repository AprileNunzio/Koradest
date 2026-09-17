import { esc } from '../../shared/html.js';
import { openModal } from '../../shared/modale.js';
import NetworksService from './networks_service.js';

export const openUnlockModal = (host, network, { onUnlocked }) => {
    const modal = openModal(host, {
        id: 'net-modal-unlock',
        title: 'Codice di sicurezza richiesto',
        icon: 'lock',
        confirmLabel: 'Entra nella rete',
        bodyHtml: `
            <div class="net-inline-note">
                <span class="material-symbols-rounded">hexagon</span>
                <span>Stai per accedere alla rete <strong>${esc(network.name)}</strong>. I dati sono cifrati con il codice di sicurezza: senza di esso non possono essere letti.</span>
            </div>
            <div class="net-field">
                <label for="net-unlock-code">Codice di sicurezza</label>
                <input id="net-unlock-code" name="code" class="net-code-input" type="text" maxlength="20" autocomplete="off" placeholder="XXX-XXX-XXX" required>
            </div>
            <label class="net-check">
                <input name="remember" type="checkbox">
                <span>Memorizza il codice su questo dispositivo.</span>
            </label>
        `
    });
    modal.onConfirm(async () => {
        const code = modal.value('code');
        if (code.replace(/[^A-Za-z0-9]/g, '').length < 5) {
            modal.setError('Il codice di sicurezza non e completo.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        const result = await NetworksService.activate({
            networkId: network.id,
            code,
            remember: modal.value('remember') === true
        });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Accesso alla rete non riuscito.');
            return;
        }
        modal.close();
        onUnlocked(result);
    });
};

export default openUnlockModal;
