import { Router, toast } from '../../utils.js';
import { createCloneProgressModal, updateCloneStep, closeCloneProgressModal } from './clone_progress_view.js';
import { OOBE_TEMPLATE } from './oobe_template.js';
import { esc as _esc } from '../../shared/html.js';

function validateIPAddress(ip) {
    try {
        const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return regex.test(ip);
    } catch (e) {
        return false;
    }
}

function sanitizeNetworkCode(code) {
    try {
        return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    } catch (e) {
        return '';
    }
}

async function handleCloneNetwork(node, networkCode) {
    try {
        createCloneProgressModal();
        const modalNodeName = document.getElementById('clone-modal-node-name');
        if (modalNodeName) modalNodeName.textContent = `Connessione a: ${node.name || 'Nodo Remoto'} (${node.host || node.ip || 'LAN'})`;
        if (window.electronAPI && window.electronAPI.onCloneProgress) {
            window.electronAPI.onCloneProgress((prog) => {
                try { updateCloneStep(prog); } catch (_) {}
            });
        }
        if (!window.electronAPI) {
            closeCloneProgressModal();
            return false;
        }
        const res = await window.electronAPI.cloneNetwork({
            host: node.host || node.ip,
            port: node.port || 34567,
            networkCode: networkCode,
            networkName: node.name || 'Network'
        });
        if (res === true || (res && res.success)) {
            updateCloneStep({ step: 'settings', label: 'Impostazioni e parametri applicati', status: 'done' });
            toast("Sincronizzazione completata con successo.", "success");
            setTimeout(() => {
                try {
                    closeCloneProgressModal();
                    Router.navigate('auth_login');
                } catch (_) {}
            }, 1200);
            return true;
        } else {
            closeCloneProgressModal();
            const errorMsg = (res && res.error) ? res.error : "Accesso negato: Codice errato o firewall attivo.";
            toast(errorMsg, "error");
            return false;
        }
    } catch (e) {
        closeCloneProgressModal();
        toast("Errore critico durante la negoziazione P2P.", "error");
        return false;
    }
}

function promptNetworkCode(el, node) {
    try {
        const modal = el.querySelector('#network-code-modal');
        const input = el.querySelector('#modal-network-code-input');
        const confirmBtn = el.querySelector('#btn-modal-confirm');
        const cancelBtn = el.querySelector('#btn-modal-cancel');
        const titleDesc = el.querySelector('#modal-network-name');
        titleDesc.innerHTML = `Connessione a: <b>${_esc(node.name)}</b><br><span style="font-family: monospace; font-size: 0.85rem; opacity: 0.8;">IPv4: ${_esc(node.host)}</span>`;
        input.value = '';
        modal.style.display = 'flex';
        input.focus();
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newCancel.addEventListener('click', () => {
            try { modal.style.display = 'none'; } catch (e) {}
        });
        newConfirm.addEventListener('click', async () => {
            try {
                const rawCode = input.value;
                const safeCode = sanitizeNetworkCode(rawCode);
                if (safeCode.length < 5) {
                    input.style.borderColor = 'var(--md-error)';
                    toast("Codice di sicurezza non conforme.", "error");
                    return;
                }
                input.style.borderColor = 'transparent';
                modal.style.display = 'none';
                await handleCloneNetwork(node, safeCode);
            } catch (e) {}
        });
    } catch (e) {}
}

async function performManualPing(el, ip) {
    try {
        const btn = el.querySelector('#btn-ip-manual-connect');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Ping...';
        btn.disabled = true;
        if (window.electronAPI && window.electronAPI.pingNode) {
            const start = performance.now();
            const res = await window.electronAPI.pingNode({ host: ip, port: 34567 });
            const latency = Math.round(performance.now() - start);
            if (res.success) {
                toast(`Ping OK (${latency}ms). Handshake completato.`, "success");
                const fakeNode = { name: res.data.node || 'Nodo KORADEST', host: ip, port: 34567 };
                promptNetworkCode(el, fakeNode);
            } else {
                toast(`Connessione rifiutata o timeout: ${res.error}`, "error");
            }
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch(e) {
        toast("Errore interno durante il ping.", "error");
    }
}

function bindManualConnect(el, btnId, inputId) {
    try {
        const btn = el.querySelector('#' + btnId);
        const inp = el.querySelector('#' + inputId);
        if (!btn || !inp) return;
        btn.addEventListener('click', () => {
            try {
                const ip = inp.value.trim();
                if (!validateIPAddress(ip)) {
                    toast("Indirizzo IPv4 non valido.", "error");
                    return;
                }
                performManualPing(el, ip);
            } catch (e) {}
        });
    } catch (e) {}
}

async function renderPublicNetworkWarning(el) {
    try {
        if (!window.electronAPI || !window.electronAPI.checkNetworkProfile) return;
        const profile = await window.electronAPI.checkNetworkProfile();
        const fwEl = el.querySelector('#telemetry-firewall');
        if (fwEl) fwEl.textContent = profile;
        if (profile === 'Public') {
            const warningHTML = `
                <div style="background: rgba(255, 82, 82, 0.1); border: 1px solid var(--md-error); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: flex-start;">
                        <span class="material-symbols-rounded" style="color: var(--md-error); font-size: 2rem;">gpp_maybe</span>
                        <div>
                            <h4 style="color: var(--md-error); margin: 0 0 0.5rem 0; font-size: 1.1rem;">Restrizioni Firewall (Rete Pubblica)</h4>
                            <p style="font-size: 0.95rem; color: var(--md-on-surface); margin: 0; line-height: 1.5;">
                                Windows ha configurato la connessione su "Rete Pubblica". Windows Firewall blocca le comunicazioni locali tra postazioni.
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button id="btn-fix-network-profile" class="btn btn-primary" style="border-radius: 12px; font-weight: 600; padding: 0.6rem 1.2rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="material-symbols-rounded">security</span> Imposta Rete come Privata (Consigliato)
                        </button>
                    </div>
                </div>
            `;
            const warnContainer = el.querySelector('#warning-container');
            if (warnContainer) {
                warnContainer.innerHTML = warningHTML;
                const fixBtn = warnContainer.querySelector('#btn-fix-network-profile');
                if (fixBtn) {
                    fixBtn.addEventListener('click', async () => {
                        try {
                            if (window.electronAPI && window.electronAPI.setNetworkProfilePrivate) {
                                toast("Applicazione profilo di rete in corso...", "info");
                                const fixRes = await window.electronAPI.setNetworkProfilePrivate();
                                if (fixRes && fixRes.success) {
                                    toast("Profilo di rete impostato su Privata con successo!", "success");
                                    warnContainer.innerHTML = '';
                                    if (fwEl) fwEl.textContent = 'Private';
                                } else {
                                    toast("Impossibile modificare il profilo automaticamente.", "error");
                                }
                            }
                        } catch (fixErr) {
                            toast("Errore durante l'operazione.", "error");
                        }
                    });
                }
            }
        }
    } catch (e) {}
}

async function executeNetworkScan(el) {
    try {
        const listElement = el.querySelector('#nodes-list');
        const statusEl = el.querySelector('#scan-status');
        if (!window.electronAPI) return;
        if (window.electronAPI && window.electronAPI.onScanProgress) {
            window.electronAPI.onScanProgress((msg) => {
                statusEl.textContent = msg;
                statusEl.style.background = 'var(--md-primary-container)';
                statusEl.style.color = 'var(--md-on-primary-container)';
            });
        }
        const nodes = await window.electronAPI.scanNodes();
        statusEl.textContent = 'Scansione completata';
        statusEl.style.background = 'var(--md-surface-variant)';
        statusEl.style.color = 'var(--md-on-surface-variant)';
        if (nodes.length === 0) {
            listElement.innerHTML = `
                <div style="text-align: center; padding: 4rem 0; color: var(--md-on-surface-variant); background: var(--md-surface); border-radius: 20px; border: 1px dashed var(--md-outline);">
                    <span class="material-symbols-rounded" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">wifi_off</span>
                    <h3 style="margin-bottom: 0.5rem;">Nessun Nodo Trovato</h3>
                    <p style="font-size: 0.95rem;">Assicurati che l'altro computer sia acceso, con l'app avviata e connesso alla stessa rete LAN.</p>
                </div>
            `;
        } else {
            listElement.innerHTML = '';
            nodes.forEach(node => {
                try {
                    const card = document.createElement('div');
                    card.className = 'node-card fade-in-up';
                    card.innerHTML = `
                        <div class="node-status-indicator"></div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 0.3rem 0; color: var(--md-primary); font-size: 1.2rem;">${_esc(node.name)}</h3>
                            <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--md-on-surface-variant); font-family: monospace;">
                                <span><span class="material-symbols-rounded" style="font-size: 1rem; vertical-align: bottom;">lan</span> ${_esc(node.ip || node.host || 'Sconosciuto')}</span>
                                <span><span class="material-symbols-rounded" style="font-size: 1rem; vertical-align: bottom;">cable</span> Port ${_esc(node.port)}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary" style="border-radius: 50%; width: 48px; height: 48px; padding: 0; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-rounded">login</span>
                        </button>
                    `;
                    card.addEventListener('click', () => {
                        try { promptNetworkCode(el, node); } catch (e) {}
                    });
                    listElement.appendChild(card);
                } catch (e) {}
            });
        }
    } catch (e) {}
}

export default {
    render: async (el) => {
        try {
            el.innerHTML = OOBE_TEMPLATE;
            try {
                if (window.electronAPI && window.electronAPI.getLocalIPs) {
                    const ips = await window.electronAPI.getLocalIPs();
                    if (ips && ips.length > 0) {
                        el.querySelector('#telemetry-host').innerHTML = ips.map(ip => `<span style="background: var(--md-secondary-container); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${ip}</span>`).join(' ');
                    } else {
                        el.querySelector('#telemetry-host').textContent = 'Localhost / Isolato';
                    }
                }
            } catch(e){}
            try {
                if (window.electronAPI && window.electronAPI.dbGetBackupStatus) {
                    const status = await window.electronAPI.dbGetBackupStatus();
                    const unlockContainer = el.querySelector('#unlock-container');
                    const unlockDetails = el.querySelector('#unlock-details');
                    let hasArchive = false;
                    let detailsHtml = '';
                    if (status && status.primary && (status.primary.appData || status.primary.docs)) {
                        hasArchive = true;
                        const size = status.primary.appData || status.primary.docs;
                        const mb = (size / (1024 * 1024)).toFixed(2);
                        detailsHtml += `Archivio Primario: ${mb} MB<br>`;
                    }
                    if (status && status.totalBackups > 0) {
                        hasArchive = true;
                        detailsHtml += `${status.totalBackups} Backup Locali Trovati`;
                    }
                    if (hasArchive) {
                        unlockContainer.style.display = 'flex';
                        if (detailsHtml) {
                            unlockDetails.innerHTML = detailsHtml;
                        }
                    }
                }
            } catch(e){}
            const createBtn = el.querySelector('#btn-create');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    try { Router.navigate('auth_register'); } catch (e) {}
                });
            }
            const joinBtn = el.querySelector('#btn-join');
            if (joinBtn) {
                joinBtn.addEventListener('click', async () => {
                    try {
                        el.querySelector('#initial-placeholder').style.display = 'none';
                        const container = el.querySelector('#join-container');
                        container.style.display = 'flex';
                        await renderPublicNetworkWarning(el);
                        bindManualConnect(el, 'btn-ip-manual-connect', 'ip-manual-connect');
                        const rescanBtn = el.querySelector('#btn-rescan');
                        rescanBtn.addEventListener('click', async () => {
                            try {
                                const listElement = el.querySelector('#nodes-list');
                                listElement.innerHTML = `
                                    <div style="text-align: center; padding: 3rem 0; color: var(--md-on-surface-variant);">
                                        <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 1rem; animation: spin 1s linear infinite;">sync</span>
                                        <p>Riavvio scansione in corso...</p>
                                    </div>
                                `;
                                await executeNetworkScan(el);
                            } catch(e){}
                        });
                        await executeNetworkScan(el);
                    } catch (e) {}
                });
            }
            const unlockBtn = el.querySelector('#btn-unlock');
            if (unlockBtn) {
                unlockBtn.addEventListener('click', () => {
                    try {
                        promptNetworkCode(el, { name: "Archivio Locale", host: "localhost", port: "N/A" });
                        const titleDesc = el.querySelector('#modal-network-name');
                        if(titleDesc) {
                            titleDesc.innerHTML = `Archivio cifrato rilevato.<br><span style="font-size: 0.85rem; opacity: 0.8;">Inserisci il codice di sblocco (Master Key / Seed Phrase)</span>`;
                        }
                    } catch (e) {}
                });
            }
            const importBtn = el.querySelector('#btn-import');
            if (importBtn) {
                importBtn.addEventListener('click', () => {
                    try {
                        toast("Funzione di importazione da backup USB in fase di sviluppo.", "info");
                    } catch (e) {}
                });
            }
            const settingsBtn = el.querySelector('#btn-oobe-settings');
            const settingsModal = el.querySelector('#oobe-settings-modal');
            const closeSettingsBtn = el.querySelector('#btn-close-settings');
            if (settingsBtn && settingsModal) {
                settingsBtn.addEventListener('click', async () => {
                    try {
                        settingsModal.style.display = 'flex';
                        const diagStatus = el.querySelector('#settings-diag-status');
                        if (window.electronAPI && window.electronAPI.getAppStatus) {
                            const status = await window.electronAPI.getAppStatus();
                            diagStatus.innerHTML = `Versione App: ${status.version || 'N/D'}\nVersione Protocollo P2P: ${status.protocolVersion || 'N/D'}\nNodi Connessi: ${status.connectedNodes || 0}\nStato Sincronizzazione: ${status.syncState || 'N/D'}\nBlocchi Ledger: ${status.ledgerHeight || 0}`;
                        } else {
                            diagStatus.textContent = "Impossibile recuperare lo stato dal backend.";
                        }
                    } catch (e) {
                        toast("Errore durante l'apertura delle impostazioni.", "error");
                    }
                });
                closeSettingsBtn.addEventListener('click', () => {
                    settingsModal.style.display = 'none';
                });
                const tabs = el.querySelectorAll('.settings-tab');
                const contents = el.querySelectorAll('.settings-tab-content');
                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        tabs.forEach(t => {
                            t.classList.remove('active');
                            t.style.background = 'var(--md-surface-variant)';
                            t.style.color = 'var(--md-on-surface-variant)';
                        });
                        tab.classList.add('active');
                        tab.style.background = 'var(--md-primary-container)';
                        tab.style.color = 'var(--md-on-primary-container)';
                        contents.forEach(c => c.style.display = 'none');
                        el.querySelector('#' + tab.dataset.target).style.display = 'block';
                    });
                });
                el.querySelector('#btn-run-diag').addEventListener('click', async () => {
                    if (window.electronAPI && window.electronAPI.runDiagnostics) {
                        toast("Diagnostica in corso...", "info");
                        const res = await window.electronAPI.runDiagnostics();
                        if(res && res.success) toast("Test completato. Risultati in log.", "success");
                    }
                });
                el.querySelector('#btn-export-logs').addEventListener('click', async () => {
                    if (window.electronAPI && window.electronAPI.exportLogs) {
                        const res = await window.electronAPI.exportLogs();
                        if (res && res.success) {
                            toast(`Log esportati in ${res.path}`, "success");
                        } else if (res && !res.canceled) {
                            toast("Errore esportazione log: " + res.error, "error");
                        }
                    }
                });
                el.querySelector('#btn-hard-reset').addEventListener('click', async () => {
                    const { conferma } = await import('../../utils.js');
                    const ok = await conferma({
                        titolo: 'Eliminare tutti i dati locali?',
                        testo: 'L\'app verrà ripristinata e la postazione disconnessa dalla rete.',
                        etichetta: 'Elimina e ripristina',
                        pericolosa: true
                    });
                    if (ok && window.electronAPI && window.electronAPI.resetApp) {
                        window.electronAPI.resetApp();
                    }
                });
                el.querySelector('#btn-check-updates').addEventListener('click', () => {
                    if (window.electronAPI && window.electronAPI.checkForUpdates) {
                        toast("Controllo aggiornamenti in corso...", "info");
                        window.electronAPI.checkForUpdates();
                    }
                });
                el.querySelector('#btn-toggle-devtools').addEventListener('click', () => {
                    if (window.electronAPI && window.electronAPI.toggleDevTools) {
                        window.electronAPI.toggleDevTools();
                    }
                });
            }
        } catch (e) {
            try {
                el.innerHTML = `<p style="color: var(--md-error); text-align: center;">Inizializzazione OOBE Fallita.</p>`;
            } catch (fallbackError) {}
        }
    }
};