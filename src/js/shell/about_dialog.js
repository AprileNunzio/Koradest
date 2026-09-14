import { esc, openModal } from '../pages/networks/network_dom.js';
import { networksApi } from './session_state.js';
import { ABOUT_STYLES } from './about_dialog_styles.js';

const STYLE_ID = 'about-dialog-styles';
const UNKNOWN = 'non disponibile';

const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    document.head.insertAdjacentHTML('beforeend', ABOUT_STYLES);
};

const item = ({ icon, label, value, mono = false, wide = false, dot = null }) => `
    <div class="about-item${wide ? ' is-wide' : ''}">
        <span class="material-symbols-rounded" aria-hidden="true">${esc(icon)}</span>
        <span class="about-text">
            <span class="about-label">${esc(label)}</span>
            <span class="about-value${mono ? ' is-mono' : ''}${value === UNKNOWN ? ' is-muted' : ''}">${dot ? `<span class="about-dot is-${esc(dot)}"></span>` : ''}${esc(value)}</span>
        </span>
    </div>
`;

const hero = (version) => `
    <div class="about-hero">
        <div class="about-hero-row">
            <div class="about-mark"><span class="material-symbols-rounded">hexagon</span></div>
            <div class="about-titles">
                <h3 class="about-name">KORADEST</h3>
                <p class="about-claim">Architettura Dinamica per l'Espansione e lo Sviluppo Tecnologico di Imprese e Organizzazioni</p>
                <span class="about-version"><span class="material-symbols-rounded">sell</span>Versione ${esc(version)}</span>
            </div>
        </div>
    </div>
`;

const collect = async () => {
    const api = window.electronAPI;
    const status = api && typeof api.getAppStatus === 'function' ? await api.getAppStatus() : null;
    const networks = networksApi();
    const activeResult = networks ? await networks.getActive() : null;
    const nodeId = api && typeof api.getNodeId === 'function' ? await api.getNodeId() : null;
    const ips = api && typeof api.getLocalIPs === 'function' ? await api.getLocalIPs() : [];
    return {
        version: (status && status.version) || UNKNOWN,
        protocol: status && status.protocolVersion ? `v${status.protocolVersion}` : UNKNOWN,
        network: activeResult && activeResult.active ? activeResult.active.name : null,
        nodeId: nodeId || UNKNOWN,
        blocks: status && status.ledgerHeight !== undefined ? String(status.ledgerHeight) : UNKNOWN,
        peers: status && status.connectedNodes !== undefined ? String(status.connectedNodes) : UNKNOWN,
        ip: Array.isArray(ips) && ips.length > 0 ? ips[0] : UNKNOWN
    };
};

export const showAboutDialog = async () => {
    ensureStyles();
    const data = await collect();
    const modal = openModal(document.body, {
        id: 'about-dialog',
        title: 'Informazioni',
        icon: 'info',
        confirmLabel: 'Chiudi',
        cancelLabel: null,
        bodyHtml: [
            hero(data.version),
            '<div class="about-grid">',
            item({
                icon: 'hub',
                label: 'Rete attiva',
                value: data.network || 'Nessuna rete aperta',
                wide: true,
                dot: data.network ? 'ok' : 'warn'
            }),
            item({ icon: 'device_hub', label: 'Nodi collegati', value: data.peers }),
            item({ icon: 'account_tree', label: 'Blocchi nel registro', value: data.blocks }),
            item({ icon: 'lan', label: 'Protocollo P2P', value: data.protocol }),
            item({ icon: 'router', label: 'Indirizzo locale', value: data.ip, mono: true }),
            item({ icon: 'fingerprint', label: 'Identificativo nodo', value: data.nodeId, mono: true, wide: true }),
            '</div>',
            '<p class="about-foot">Copyright 2026 NunzioTech. Tutti i dati della rete sono cifrati localmente.</p>'
        ].join('')
    });
    modal.onConfirm(() => modal.close());
};

export default showAboutDialog;
