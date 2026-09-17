import { toast } from '../utils.js';

const OVERLAY_ID = 'p2p-update-overlay';

const buildOverlay = () => {
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 999999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff;';
    overlay.innerHTML = `
        <div style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 500px; position: relative;">
            <button id="close-update-overlay" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer;"><span class="material-symbols-rounded">close</span></button>
            <span class="material-symbols-rounded" style="font-size: 64px; color: var(--md-primary); margin-bottom: 20px;">system_update_alt</span>
            <h2 id="p2p-update-title" style="margin: 0 0 10px 0; font-weight: 500;"></h2>
            <p id="p2p-update-msg" style="margin: 0 0 20px 0; color: rgba(255,255,255,0.7); line-height: 1.5;"></p>
            <div style="width: 100%; background: rgba(255,255,255,0.1); border-radius: 8px; height: 16px; overflow: hidden; margin-bottom: 10px;">
                <div id="p2p-update-progress-bar" style="width: 0%; height: 100%; background: var(--md-primary); transition: width 0.3s ease;"></div>
            </div>
            <div id="p2p-update-status" style="font-size: 14px; color: rgba(255,255,255,0.5);">Inizializzazione...</div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#close-update-overlay').addEventListener('click', () => { overlay.style.display = 'none'; });
    return overlay;
};

const showOverlay = (title, message) => {
    const overlay = document.getElementById(OVERLAY_ID) || buildOverlay();
    overlay.style.display = 'flex';
    overlay.querySelector('#p2p-update-title').innerText = title;
    overlay.querySelector('#p2p-update-msg').innerText = message;
    return overlay;
};

const bindConsentModal = (data) => {
    const modal = document.getElementById('update-consent-modal');
    const versionText = document.getElementById('update-consent-version');
    const btnLater = document.getElementById('update-consent-later');
    const btnNow = document.getElementById('update-consent-now');
    if (!modal || !versionText || !btnLater || !btnNow) return;
    versionText.innerText = `L'aggiornamento ${data.version}${data.source ? ` (${data.source})` : ''}`;
    modal.hidden = false;
    const restore = () => {
        btnNow.innerText = 'Riavvia e Installa';
        btnNow.disabled = false;
        btnLater.disabled = false;
    };
    btnLater.onclick = () => {
        modal.hidden = true;
        toast('Aggiornamento posticipato. Verra installato al prossimo avvio.', 'info');
    };
    btnNow.onclick = async () => {
        btnNow.innerText = 'Riavvio in corso...';
        btnNow.disabled = true;
        btnLater.disabled = true;
        const timeout = setTimeout(() => {
            toast('Installazione non avviata. Riprova.', 'error');
            restore();
        }, 8000);
        try {
            const started = await window.electronAPI.installPendingUpdate();
            clearTimeout(timeout);
            if (!started) {
                toast('Impossibile avviare l installazione.', 'error');
                restore();
            }
        } catch (e) {
            clearTimeout(timeout);
            toast('Errore durante l avvio dell installazione.', 'error');
            restore();
        }
    };
};

const onStatus = (statusData) => {
    if (!statusData || !statusData.status) return;
    if (statusData.isError) {
        toast(statusData.status, 'error');
        return;
    }
    if (statusData.status.includes('Sei gia aggiornato') || statusData.status.includes('ultima versione')) {
        toast(statusData.status, 'info');
        return;
    }
    const overlay = document.getElementById(OVERLAY_ID);
    if (statusData.status.includes('Download') || statusData.status.includes('scaricato')) {
        if (!overlay || overlay.style.display === 'none') {
            showOverlay('Aggiornamento Software', 'Download nuova versione in corso...');
        }
    }
    const statusNode = document.getElementById('p2p-update-status');
    if (statusNode) statusNode.innerText = statusData.status;
    if (!statusData.finished) return;
    const bar = document.getElementById('p2p-update-progress-bar');
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
        const current = document.getElementById(OVERLAY_ID);
        if (current && !statusData.status.includes('Riavvio')) current.style.display = 'none';
    }, 3000);
};

export const initUpdateOverlay = () => {
    const api = window.electronAPI;
    if (!api) return;
    if (api.onNetworkVersionMismatch) {
        api.onNetworkVersionMismatch((data) => {
            const overlay = showOverlay(
                'Aggiornamento di Rete Obbligatorio',
                'E stata rilevata una versione del protocollo piu recente sulla rete locale. Per proteggere l integrita del database, questo nodo deve aggiornarsi.'
            );
            const closeBtn = overlay.querySelector('#close-update-overlay');
            if (closeBtn) closeBtn.style.display = 'none';
            api.forceP2PUpdate(data.peerIp);
        });
    }
    if (api.onUpdateDownloadProgress) {
        api.onUpdateDownloadProgress((progress) => {
            const bar = document.getElementById('p2p-update-progress-bar');
            const statusNode = document.getElementById('p2p-update-status');
            if (bar) bar.style.width = Math.max(5, progress.percent) + '%';
            if (statusNode) statusNode.innerText = `Scaricamento${progress.source ? ` da ${progress.source}` : ''}: ${progress.percent.toFixed(1)}%`;
        });
    }
    if (api.onUpdateStatus) api.onUpdateStatus(onStatus);
    if (api.onUpdateReadyForInstall) {
        api.onUpdateReadyForInstall((data) => {
            const overlay = document.getElementById(OVERLAY_ID);
            if (overlay) overlay.style.display = 'none';
            const dropdown = document.getElementById('app-dropdown-menu');
            if (dropdown) dropdown.style.display = 'none';
            bindConsentModal(data);
        });
    }
};

export default initUpdateOverlay;
