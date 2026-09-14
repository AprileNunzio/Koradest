import { Router, toast } from '../../utils.js';
import { esc, openModal } from './network_dom.js';
import NETWORKS_STYLES from './networks_styles.js';
import NetworksService from './networks_service.js';
import { renderNetworkCard, renderEmptyState } from './network_card.js';
import { renderToolbar, bindToolbar } from './network_toolbar.js';
import openCreateNetworkModal from './network_create_modal.js';
import openJoinNetworkModal from './network_join_modal.js';
import openUnlockModal from './network_unlock_modal.js';
import openOptionsModal from './network_options_modal.js';
import openQuorumModal from './network_quorum_modal.js';
import openRecoveryKitModal from './network_recovery_kit_modal.js';
import openRecoveryRestoreModal from './network_recovery_restore_modal.js';
import renderProfileBanner from './network_profile_banner.js';

const PAGE_SHELL = `
    <section class="net-page">
        <header class="net-head">
            <h1>Le tue reti blockchain</h1>
            <p>Seleziona la rete su cui vuoi lavorare. Questa postazione resta collegata a una sola rete per volta: uscendo da una rete i suoi dati vengono chiusi e cifrati.</p>
        </header>
        <div id="net-profile-slot"></div>
        <div class="net-grid" id="net-grid" role="list"></div>
    </section>
    <div id="net-toolbar-host"></div>
    ${NETWORKS_STYLES}
`;

const routeAfterActivation = async () => {
    const userCount = await NetworksService.countUsers();
    Router.navigate(userCount > 0 ? 'auth_login' : 'auth_register');
};

const NetworksPage = {
    state: { networks: [], active: null },

    render: async (el) => {
        el.innerHTML = PAGE_SHELL;
        renderProfileBanner(el);
        await NetworksPage.refresh(el);
        NetworksService.onQuorumLost((data) => {
            toast(data && data.message ? data.message : 'Quorum di rete non raggiunto.', 'error');
        });
    },

    refresh: async (el) => {
        const result = await NetworksService.list();
        if (!result.success) {
            toast(result.error || 'Elenco delle reti non disponibile.', 'error');
            return;
        }
        NetworksPage.state.networks = result.networks || [];
        NetworksPage.state.active = result.active || null;
        NetworksPage.paint(el);
    },

    paint: (el) => {
        const grid = el.querySelector('#net-grid');
        const toolbarHost = el.querySelector('#net-toolbar-host');
        if (!grid || !toolbarHost) return;
        const networks = NetworksPage.state.networks;
        grid.innerHTML = networks.length === 0 ? renderEmptyState() : networks.map(renderNetworkCard).join('');
        toolbarHost.innerHTML = renderToolbar(Boolean(NetworksPage.state.active));
        NetworksPage.bindCards(el);
        bindToolbar(toolbarHost, {
            create: () => openCreateNetworkModal(el, { onCreated: () => Router.navigate('auth_register') }),
            join: () => openJoinNetworkModal(el, {
                onJoined: async () => {
                    toast('Rete sincronizzata correttamente.', 'success');
                    await routeAfterActivation();
                },
                onProgress: (message) => toast(message, 'info')
            }),
            recover: () => openRecoveryRestoreModal(el, {
                onRestored: async (result) => {
                    if (result.registered) {
                        await routeAfterActivation();
                        return;
                    }
                    await NetworksPage.refresh(el);
                }
            }),
            refresh: () => NetworksPage.refresh(el),
            leave: () => NetworksPage.leaveActive(el),
            quorum: () => openQuorumModal(el, {
                onSaved: () => toast('Regole di accesso aggiornate.', 'success'),
                onError: (message) => toast(message, 'error')
            })
        });
    },

    bindCards: (el) => {
        el.querySelectorAll('[data-network-id]').forEach(card => {
            const id = card.getAttribute('data-network-id');
            const network = NetworksPage.state.networks.find(n => n.id === id);
            if (!network) return;
            card.addEventListener('click', (event) => {
                if (event.target.closest('[data-network-options]')) return;
                NetworksPage.enter(el, network);
            });
            card.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                NetworksPage.enter(el, network);
            });
        });
        el.querySelectorAll('[data-network-options]').forEach(button => {
            const id = button.getAttribute('data-network-options');
            const network = NetworksPage.state.networks.find(n => n.id === id);
            if (!network) return;
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                NetworksPage.options(el, network);
            });
        });
    },

    enter: async (el, network) => {
        if (network.isActive) {
            await routeAfterActivation();
            return;
        }
        if (!network.hasStoredCode) {
            openUnlockModal(el, network, { onUnlocked: routeAfterActivation });
            return;
        }
        toast(`Apertura della rete ${network.name}...`, 'info');
        const result = await NetworksService.activate({ networkId: network.id });
        if (result.success) {
            await routeAfterActivation();
            return;
        }
        if (result.code === 'NETWORK_CODE_REQUIRED' || result.code === 'NETWORK_CODE_MISMATCH') {
            openUnlockModal(el, network, { onUnlocked: routeAfterActivation });
            return;
        }
        toast(result.error || 'Accesso alla rete non riuscito.', 'error');
        await NetworksPage.refresh(el);
    },

    options: (el, network) => {
        openOptionsModal(el, network, {
            onChanged: async () => {
                toast('Impostazioni della rete aggiornate.', 'success');
                await NetworksPage.refresh(el);
            },
            onRemoved: async () => {
                toast('Rete rimossa da questa postazione.', 'success');
                await NetworksPage.refresh(el);
            },
            onReveal: () => NetworksPage.reveal(el),
            onRecoveryKit: () => openRecoveryKitModal(el),
            onExport: () => NetworksPage.exportArchive(),
            onQuorum: () => openQuorumModal(el, {
                onSaved: () => toast('Regole di accesso aggiornate.', 'success'),
                onError: (message) => toast(message, 'error')
            })
        });
    },

    reveal: (el) => {
        const modal = openModal(el, {
            id: 'net-modal-stepup',
            title: 'Conferma la tua identita',
            icon: 'lock_person',
            confirmLabel: 'Mostra il codice',
            bodyHtml: `
                <div class="net-inline-note">
                    <span class="material-symbols-rounded">shield</span>
                    <span>Il codice di sicurezza cifra tutti i dati della rete. Reinserisci il tuo PIN o la tua password per visualizzarlo.</span>
                </div>
                <div class="net-field">
                    <label for="net-stepup-cred">PIN o password</label>
                    <input id="net-stepup-cred" name="credential" type="password" autocomplete="current-password" required>
                </div>
            `
        });
        modal.onConfirm(async () => {
            const credential = modal.value('credential');
            if (!credential) {
                modal.setError('Inserisci il PIN o la password.');
                return;
            }
            modal.setError('');
            modal.setBusy(true);
            const result = await NetworksService.revealCode({ credential });
            modal.setBusy(false);
            if (!result.success) {
                modal.setError(result.error || 'Codice non disponibile.');
                return;
            }
            modal.close();
            NetworksPage.showCode(el, result.code);
        });
    },

    showCode: (el, code) => {
        const modal = openModal(el, {
            id: 'net-modal-reveal',
            title: 'Codice di sicurezza della rete',
            icon: 'vpn_key',
            confirmLabel: 'Chiudi',
            cancelLabel: null,
            bodyHtml: `
                <div class="net-inline-note">
                    <span class="material-symbols-rounded">shield</span>
                    <span>Condividi questo codice solo con i computer autorizzati a entrare nella rete.</span>
                </div>
                <div class="net-reveal">${esc(code)}</div>
            `
        });
        modal.onConfirm(() => modal.close());
    },

    exportArchive: async () => {
        toast('Scegli la cartella di destinazione...', 'info');
        const result = await NetworksService.exportArchive();
        if (result.canceled) return;
        if (!result.success) {
            toast(result.error || 'Copia di sicurezza non riuscita.', 'error');
            return;
        }
        const mega = Math.round(result.bytes / 1024 / 1024 * 10) / 10;
        toast(`Copia completata: ${result.file} archivi (${mega} MB) in ${result.destinazione}`, 'success');
    },

    leaveActive: async (el) => {
        const result = await NetworksService.deactivate();
        if (!result.success) {
            toast(result.error || 'Disconnessione non riuscita.', 'error');
            return;
        }
        toast('Rete chiusa e archivio cifrato.', 'success');
        await NetworksPage.refresh(el);
    }
};

export default NetworksPage;
