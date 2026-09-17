import { esc } from '../../shared/html.js';
import { openModal } from '../../shared/modale.js';
import NetworksService from './networks_service.js';

const IPV4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
const DEFAULT_PORT = 34567;

const JOIN_FORM = `
    <div class="net-field">
        <label>Nodi KORADEST rilevati sulla rete locale</label>
        <div class="net-scan-list" id="net-scan-list">
            <div class="net-inline-note"><span class="material-symbols-rounded">sync</span><span>Scansione della rete locale in corso...</span></div>
        </div>
    </div>
    <div class="net-field">
        <label for="net-join-ip">Oppure indirizzo IPv4 del nodo</label>
        <input id="net-join-ip" name="host" type="text" inputmode="decimal" autocomplete="off" placeholder="192.168.1.10">
    </div>
    <div class="net-field">
        <label for="net-join-code">Codice di sicurezza della rete</label>
        <input id="net-join-code" name="code" class="net-code-input" type="text" maxlength="20" autocomplete="off" placeholder="XXX-XXX-XXX" required>
    </div>
    <div class="net-field">
        <label for="net-join-name">Nome con cui salvare la rete (facoltativo)</label>
        <input id="net-join-name" name="name" type="text" maxlength="60" autocomplete="off" placeholder="Lascia vuoto per usare il nome originale">
        <small>Se lo lasci vuoto viene usato il nome scelto da chi ha creato la rete. Compilalo solo se vuoi un'etichetta diversa su questa postazione.</small>
    </div>
    <label class="net-check">
        <input name="remember" type="checkbox">
        <span>Memorizza il codice su questo dispositivo per rientrare senza digitarlo.</span>
    </label>
`;

const renderScanResults = (container, nodes, onSelect) => {
    if (nodes.length === 0) {
        container.innerHTML = '<div class="net-inline-note"><span class="material-symbols-rounded">wifi_off</span><span>Nessun nodo rilevato. Inserisci manualmente l indirizzo IPv4 del computer da contattare.</span></div>';
        return;
    }
    container.innerHTML = nodes.map(node => `
        <div class="net-scan-item" data-node-ip="${esc(node.ip || node.host)}" data-node-port="${esc(node.port || DEFAULT_PORT)}" data-node-name="${esc(node.name || 'Nodo KORADEST')}">
            <span class="material-symbols-rounded">dns</span>
            <div>
                <strong>${esc(node.name || 'Nodo KORADEST')}</strong><br>
                <span class="ip">${esc(node.ip || node.host)}:${esc(node.port || DEFAULT_PORT)}</span>
            </div>
        </div>
    `).join('');
    container.querySelectorAll('.net-scan-item').forEach(item => {
        item.addEventListener('click', () => {
            container.querySelectorAll('.net-scan-item').forEach(i => i.classList.remove('is-selected'));
            item.classList.add('is-selected');
            onSelect({
                ip: item.getAttribute('data-node-ip'),
                port: parseInt(item.getAttribute('data-node-port'), 10) || DEFAULT_PORT,
                name: item.getAttribute('data-node-name')
            });
        });
    });
};

export const openJoinNetworkModal = (host, { onJoined, onProgress }) => {
    const modal = openModal(host, {
        id: 'net-modal-join',
        title: 'Entra in una rete esistente',
        icon: 'travel_explore',
        confirmLabel: 'Connetti e sincronizza',
        bodyHtml: JOIN_FORM
    });
    const listNode = modal.overlay.querySelector('#net-scan-list');
    let selected = null;
    NetworksService.scanNodes().then(nodes => {
        if (!modal.overlay.isConnected) return;
        renderScanResults(listNode, nodes, (node) => {
            selected = node;
            modal.field('host').value = node.ip;
        });
    });
    modal.onConfirm(async () => {
        const code = modal.value('code');
        const manualHost = modal.value('host');
        const targetHost = manualHost || (selected ? selected.ip : '');
        const targetPort = manualHost ? DEFAULT_PORT : (selected ? selected.port : DEFAULT_PORT);
        if (!IPV4.test(targetHost)) {
            modal.setError('Seleziona un nodo oppure inserisci un indirizzo IPv4 valido.');
            return;
        }
        if (code.replace(/[^A-Za-z0-9]/g, '').length < 5) {
            modal.setError('Il codice di sicurezza non e completo.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        if (typeof onProgress === 'function') onProgress('Sincronizzazione della rete in corso...');
        const result = await NetworksService.join({
            name: modal.value('name'),
            code,
            host: targetHost,
            port: targetPort,
            remember: modal.value('remember') === true
        });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Connessione non riuscita.');
            return;
        }
        modal.close();
        onJoined(result);
    });
};

export default openJoinNetworkModal;
