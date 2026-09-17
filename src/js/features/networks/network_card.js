import { esc } from '../../shared/html.js';
import { formatDate, shortId } from './network_dom.js';

const ROLE_LABEL = { owner: 'Amministratore', member: 'Membro' };

const buildBadges = (network) => {
    const badges = [];
    if (network.isActive) {
        badges.push('<span class="net-badge is-active"><span class="material-symbols-rounded">check_circle</span>Rete attiva</span>');
    }
    badges.push(`<span class="net-badge ${network.role === 'owner' ? 'is-owner' : ''}"><span class="material-symbols-rounded">${network.role === 'owner' ? 'shield_person' : 'person'}</span>${esc(ROLE_LABEL[network.role] || 'Membro')}</span>`);
    if (!network.hasStoredCode) {
        badges.push('<span class="net-badge is-locked"><span class="material-symbols-rounded">lock</span>Codice richiesto</span>');
    }
    if (network.autoStart && network.hasStoredCode) {
        badges.push('<span class="net-badge"><span class="material-symbols-rounded">bolt</span>Apertura automatica</span>');
    }
    if (!network.provisioned) {
        badges.push('<span class="net-badge is-draft"><span class="material-symbols-rounded">warning</span>Da completare</span>');
    }
    return badges.join('');
};

export const renderNetworkCard = (network) => `
    <article class="net-card ${network.isActive ? 'is-active' : ''}" data-network-id="${esc(network.id)}" style="--net-accent: ${esc(network.color)};" tabindex="0" role="button" aria-label="Apri la rete ${esc(network.name)}">
        <div class="net-card-top">
            <div class="net-avatar"><span class="material-symbols-rounded">hexagon</span></div>
            <div class="net-identity">
                <h2 class="net-name">${esc(network.name)}</h2>
                <p class="net-sub">ID ${esc(shortId(network.publicId))}</p>
            </div>
            <button type="button" class="net-gear" data-network-options="${esc(network.id)}" title="Opzioni della rete" aria-label="Opzioni di ${esc(network.name)}">
                <span class="material-symbols-rounded">settings</span>
            </button>
        </div>
        <div class="net-badges">${buildBadges(network)}</div>
        <div class="net-meta">
            <span><span class="material-symbols-rounded">schedule</span>Ultimo accesso: ${esc(formatDate(network.lastAccessAt))}</span>
            <span><span class="material-symbols-rounded">event</span>Registrata il ${esc(formatDate(network.createdAt))}</span>
        </div>
    </article>
`;

export const renderEmptyState = () => `
    <div class="net-empty">
        <span class="material-symbols-rounded">hub</span>
        <h3>Nessuna rete blockchain configurata</h3>
        <p>Crea la rete della tua organizzazione oppure entra in una rete gia esistente usando il suo codice di sicurezza.</p>
    </div>
`;

export default renderNetworkCard;
