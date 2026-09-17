import { toast } from '../../utils.js';

const BANNER_HTML = `
    <div class="net-inline-note" id="net-profile-banner" style="border: 1px solid var(--md-error); align-items: center;">
        <span class="material-symbols-rounded" style="color: var(--md-error);">gpp_maybe</span>
        <span style="flex: 1;">Windows classifica questa connessione come <strong>Rete Pubblica</strong>: il firewall blocca la comunicazione tra i nodi della blockchain.</span>
        <button type="button" class="net-btn" id="net-fix-profile">
            <span class="material-symbols-rounded">security</span>
            <span>Imposta come privata</span>
        </button>
    </div>
`;

export const renderProfileBanner = async (host) => {
    const slot = host.querySelector('#net-profile-slot');
    if (!slot || !window.electronAPI || typeof window.electronAPI.checkNetworkProfile !== 'function') return;
    const profile = await window.electronAPI.checkNetworkProfile();
    if (profile !== 'Public') {
        slot.innerHTML = '';
        return;
    }
    slot.innerHTML = BANNER_HTML;
    slot.querySelector('#net-fix-profile').addEventListener('click', async () => {
        toast('Applicazione del profilo di rete in corso...', 'info');
        const result = await window.electronAPI.setNetworkProfilePrivate();
        if (result && result.success) {
            toast('Profilo di rete impostato su Privata.', 'success');
            slot.innerHTML = '';
            return;
        }
        toast('Impossibile modificare automaticamente il profilo di rete.', 'error');
    });
};

export default renderProfileBanner;
