import { esc, openModal, shortId } from './network_dom.js';
import NetworksService from './networks_service.js';

const buildForm = (network) => `
    <div class="net-field">
        <label for="net-opt-name">Nome della rete su questa postazione</label>
        <input id="net-opt-name" name="name" type="text" maxlength="60" value="${esc(network.name)}" autocomplete="off" required>
        <small>Identificativo pubblico: ${esc(shortId(network.publicId))}</small>
    </div>
    <div class="net-field">
        <label for="net-opt-code">Codice di sicurezza</label>
        <input id="net-opt-code" name="code" class="net-code-input" type="text" maxlength="20" autocomplete="off" placeholder="${network.hasStoredCode ? 'Richiesto solo per le operazioni critiche' : 'XXX-XXX-XXX'}">
        <small>Necessario per memorizzare, dimenticare o rimuovere la rete.</small>
    </div>
    <label class="net-check">
        <input name="remember" type="checkbox" ${network.hasStoredCode ? 'checked' : ''}>
        <span>Memorizza il codice su questo dispositivo.</span>
    </label>
    <div class="net-inline-note">
        <span class="material-symbols-rounded">delete_forever</span>
        <span>La rimozione elimina la rete da questa postazione. Se scegli di cancellare anche i dati locali, l'archivio cifrato di questa rete viene distrutto in modo irreversibile.</span>
    </div>
    <label class="net-check">
        <input name="autoStart" type="checkbox" ${network.autoStart ? "checked" : ""} ${network.hasStoredCode ? "" : "disabled"}>
        <span>Apri questa rete automaticamente all'avvio, cosi il nodo resta raggiungibile dagli altri computer anche senza che nessuno acceda. Richiede il codice memorizzato.</span>
    </label>
    <label class="net-check">
        <input name="purgeData" type="checkbox">
        <span>Cancella anche i dati locali della rete.</span>
    </label>
`;

const confirmRemoval = (host, network, code, purgeData, onRemoved, onError) => {
    const modal = openModal(host, {
        id: 'net-modal-remove',
        title: 'Confermi la rimozione?',
        icon: 'warning',
        confirmLabel: purgeData ? 'Rimuovi e cancella i dati' : 'Rimuovi la rete',
        danger: true,
        bodyHtml: `
            <div class="net-inline-note">
                <span class="material-symbols-rounded">priority_high</span>
                <span>Stai per rimuovere <strong>${esc(network.name)}</strong> da questa postazione${purgeData ? ' ed eliminare definitivamente il suo archivio locale cifrato' : ''}.</span>
            </div>
        `
    });
    modal.onConfirm(async () => {
        modal.setBusy(true);
        const result = await NetworksService.remove({ networkId: network.id, code, purgeData });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Rimozione non riuscita.');
            return;
        }
        modal.close();
        onRemoved();
    });
    if (typeof onError === 'function') onError('');
};

const appendAction = (modal, { id, icon, label, onClick }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'net-btn';
    button.innerHTML = `<span class="material-symbols-rounded">${esc(icon)}</span><span>${esc(label)}</span>`;
    button.addEventListener('click', onClick);
    modal.overlay.querySelector('.net-modal-body').appendChild(button);
    return button;
};

export const openOptionsModal = (host, network, { onChanged, onRemoved, onReveal, onQuorum, onRecoveryKit, onExport }) => {
    const modal = openModal(host, {
        id: 'net-modal-options',
        title: 'Opzioni della rete',
        icon: 'settings',
        confirmLabel: 'Salva modifiche',
        bodyHtml: buildForm(network)
    });
    if (network.isActive) {
        appendAction(modal, {
            id: 'net-opt-quorum',
            icon: 'groups',
            label: 'Regole di accesso e quorum',
            onClick: () => { modal.close(); onQuorum(); }
        });
        appendAction(modal, {
            id: 'net-opt-export',
            icon: 'backup',
            label: 'Salva una copia di sicurezza esterna',
            onClick: () => { modal.close(); onExport(); }
        });
        appendAction(modal, {
            id: 'net-opt-kit',
            icon: 'safety_check',
            label: 'Genera un kit di recupero',
            onClick: () => { modal.close(); onRecoveryKit(); }
        });
        appendAction(modal, {
            id: 'net-opt-reveal',
            icon: 'vpn_key',
            label: 'Mostra il codice di sicurezza',
            onClick: () => { modal.close(); onReveal(network); }
        });
    }
    appendAction(modal, {
        id: 'net-opt-remove',
        icon: 'delete',
        label: 'Rimuovi questa rete dalla postazione',
        onClick: () => {
            const code = modal.value('code');
            if (code.replace(/[^A-Za-z0-9]/g, '').length < 5) {
                modal.setError('Inserisci il codice di sicurezza per rimuovere la rete.');
                return;
            }
            modal.setError('');
            const purgeData = modal.value('purgeData') === true;
            modal.close();
            confirmRemoval(host, network, code, purgeData, onRemoved);
        }
    });
    modal.onConfirm(async () => {
        const name = modal.value('name');
        if (!name) {
            modal.setError('Il nome della rete non puo essere vuoto.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        if (name !== network.name) {
            const renamed = await NetworksService.rename({ networkId: network.id, name });
            if (!renamed.success) {
                modal.setBusy(false);
                modal.setError(renamed.error || 'Rinomina non riuscita.');
                return;
            }
        }
        const remember = modal.value('remember') === true;
        if (remember !== network.hasStoredCode) {
            const code = modal.value('code');
            if (code.replace(/[^A-Za-z0-9]/g, '').length < 5) {
                modal.setBusy(false);
                modal.setError('Inserisci il codice di sicurezza per modificare la memorizzazione.');
                return;
            }
            const stored = await NetworksService.setRememberCode({ networkId: network.id, code, remember });
            if (!stored.success) {
                modal.setBusy(false);
                modal.setError(stored.error || 'Operazione non riuscita.');
                return;
            }
        }
        const autoStart = modal.value('autoStart') === true;
        if (autoStart !== Boolean(network.autoStart)) {
            const applied = await NetworksService.setAutoStart({ networkId: network.id, autoStart });
            if (!applied.success) {
                modal.setBusy(false);
                modal.setError(applied.error || 'Operazione non riuscita.');
                return;
            }
        }
        modal.setBusy(false);
        modal.close();
        onChanged();
    });
};

export default openOptionsModal;
