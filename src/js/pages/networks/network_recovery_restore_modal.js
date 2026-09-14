import { esc, openModal } from './network_dom.js';
import NetworksService from './networks_service.js';

const FORM = `
    <div class="net-inline-note">
        <span class="material-symbols-rounded">key</span>
        <span>Incolla o trascrivi le quote del kit di recupero, una per riga. Maiuscole, spazi e trattini non contano.</span>
    </div>
    <div class="net-field">
        <label for="net-restore-shares">Quote del kit</label>
        <textarea id="net-restore-shares" name="shares" rows="6" spellcheck="false" placeholder="ADR1-XXXXXXXX-01-...&#10;ADR1-XXXXXXXX-03-..."></textarea>
        <small id="net-restore-status">Nessuna quota riconosciuta.</small>
    </div>
    <label class="net-check">
        <input name="remember" type="checkbox">
        <span>Memorizza il codice recuperato su questo dispositivo.</span>
    </label>
`;

const righeDi = (testo) => String(testo || '').split(/[\r\n]+/).map(r => r.trim()).filter(Boolean);

export const openRecoveryRestoreModal = (host, { onRestored }) => {
    const modal = openModal(host, {
        id: 'net-modal-restore',
        title: 'Recupera una rete dal kit',
        icon: 'key',
        confirmLabel: 'Ricostruisci il codice',
        bodyHtml: FORM
    });
    const area = modal.overlay.querySelector('#net-restore-shares');
    const stato = modal.overlay.querySelector('#net-restore-status');

    let attesa = null;
    const aggiornaStato = async () => {
        const shares = righeDi(area.value);
        if (shares.length === 0) {
            stato.textContent = 'Nessuna quota riconosciuta.';
            stato.style.color = '';
            return;
        }
        const esito = await NetworksService.inspectRecoveryShares({ shares });
        if (!esito.success) {
            stato.textContent = esito.error || 'Impossibile analizzare le quote.';
            stato.style.color = 'var(--md-error)';
            return;
        }
        if (!esito.reteCoerente) {
            stato.textContent = 'Le quote inserite appartengono a reti diverse.';
            stato.style.color = 'var(--md-error)';
            return;
        }
        const parti = [`${esito.valide} quote valide`];
        if (esito.errori.length > 0) parti.push(`${esito.errori.length} non leggibili`);
        if (esito.riferimento) parti.push(`rete ${esito.riferimento}`);
        stato.textContent = parti.join(' - ');
        stato.style.color = esito.errori.length > 0 ? 'var(--md-warning, #f59e0b)' : 'var(--md-success, #4caf50)';
    };

    area.addEventListener('input', () => {
        clearTimeout(attesa);
        attesa = setTimeout(aggiornaStato, 250);
    });

    modal.onConfirm(async () => {
        const shares = righeDi(area.value);
        if (shares.length < 2) {
            modal.setError('Inserisci almeno due quote.');
            return;
        }
        modal.setError('');
        modal.setBusy(true);
        const result = await NetworksService.restoreFromRecoveryKit({ shares, remember: modal.value('remember') === true });
        modal.setBusy(false);
        if (!result.success) {
            modal.setError(result.error || 'Recupero non riuscito.');
            return;
        }
        modal.close();
        mostraEsito(host, result, onRestored);
    });
};

const mostraEsito = (host, result, onRestored) => {
    const registrata = result.registered === true;
    const modal = openModal(host, {
        id: 'net-modal-restore-ok',
        title: 'Codice ricostruito',
        icon: 'lock_open',
        confirmLabel: registrata ? 'Continua' : 'Ho annotato il codice',
        cancelLabel: null,
        bodyHtml: `
            <div class="net-inline-note">
                <span class="material-symbols-rounded">check_circle</span>
                <span>${registrata
                    ? 'La rete era presente su questa postazione ed e stata riaperta.'
                    : 'Questa postazione non contiene i dati della rete. Usa il codice qui sotto con "Entra in una rete" per sincronizzarti da un altro computer.'}</span>
            </div>
            <div class="net-reveal">${esc(result.code)}</div>
        `
    });
    modal.onConfirm(() => {
        modal.close();
        if (typeof onRestored === 'function') onRestored(result);
    });
};

export default openRecoveryRestoreModal;
