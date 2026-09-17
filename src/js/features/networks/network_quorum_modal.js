import { esc } from '../../shared/html.js';
import { openModal } from '../../shared/modale.js';
import NetworksService from './networks_service.js';

const ENFORCEMENTS = [
    { value: 'off', label: 'Disattivata - nessun controllo sui nodi collegati' },
    { value: 'soft', label: 'Avviso - accesso consentito con segnalazione' },
    { value: 'hard', label: 'Bloccante - accesso negato sotto il minimo' }
];

const buildForm = (policy, state) => `
    <div class="net-inline-note">
        <span class="material-symbols-rounded">hub</span>
        <span>Nodi attualmente collegati: <strong>${esc(state.current)}</strong> su <strong>${esc(state.required)}</strong> richiesti.</span>
    </div>
    <div class="net-field">
        <label for="net-quorum-min">Numero minimo di nodi collegati</label>
        <input id="net-quorum-min" name="minNodes" type="number" min="1" max="64" step="1" value="${esc(policy.minNodes)}" required>
        <small>Include sempre questa postazione. Con valore 1 la rete e utilizzabile da un solo computer.</small>
    </div>
    <div class="net-field">
        <label for="net-quorum-mode">Applicazione della regola</label>
        <select id="net-quorum-mode" name="enforcement">
            ${ENFORCEMENTS.map(e => `<option value="${esc(e.value)}" ${e.value === policy.enforcement ? 'selected' : ''}>${esc(e.label)}</option>`).join('')}
        </select>
    </div>
    <div class="net-field">
        <label for="net-quorum-grace">Tolleranza prima della disconnessione forzata (minuti)</label>
        <input id="net-quorum-grace" name="graceMinutes" type="number" min="0" max="60" step="1" value="${esc(Math.round(policy.graceMs / 60000))}" required>
        <small>Tempo concesso a una sessione gia aperta per recuperare il quorum prima del logout automatico.</small>
    </div>
    <div class="net-inline-note">
        <span class="material-symbols-rounded">policy</span>
        <span>La regola viene replicata su tutti i nodi della rete tramite il registro distribuito.</span>
    </div>
`;

export const openQuorumModal = async (host, { onSaved, onError }) => {
    const current = await NetworksService.getQuorum();
    if (!current.success) {
        if (typeof onError === 'function') onError(current.error || 'Regole di accesso non disponibili.');
        return;
    }
    const modal = openModal(host, {
        id: 'net-modal-quorum',
        title: 'Regole di accesso alla rete',
        icon: 'groups',
        confirmLabel: 'Salva regole',
        bodyHtml: buildForm(current.policy, current.state)
    });
    modal.onConfirm(async () => {
        const minNodes = parseInt(modal.value('minNodes'), 10);
        const graceMinutes = parseInt(modal.value('graceMinutes'), 10);
        if (!Number.isInteger(minNodes) || minNodes < 1 || minNodes > 64) {
            modal.setError('Il numero minimo di nodi deve essere compreso tra 1 e 64.');
            return;
        }
        if (!Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 60) {
            modal.setError('La tolleranza deve essere compresa tra 0 e 60 minuti.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        const result = await NetworksService.setQuorum({
            minNodes,
            enforcement: modal.value('enforcement'),
            graceMs: graceMinutes * 60000
        });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Salvataggio non riuscito.');
            return;
        }
        modal.close();
        if (typeof onSaved === 'function') onSaved(result);
    });
};

export default openQuorumModal;
