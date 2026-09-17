const api = () => (window.electronAPI && window.electronAPI.networks) ? window.electronAPI.networks : null;

const unavailable = { success: false, error: 'Interfaccia di sistema non disponibile.' };

const call = async (method, payload) => {
    const bridge = api();
    if (!bridge || typeof bridge[method] !== 'function') return unavailable;
    const result = await bridge[method](payload);
    return result || unavailable;
};

export const NetworksService = {
    list: () => call('list'),
    getActive: () => call('getActive'),
    create: (data) => call('create', data),
    join: (data) => call('join', data),
    activate: (data) => call('activate', data),
    deactivate: () => call('deactivate'),
    rename: (data) => call('rename', data),
    remove: (data) => call('remove', data),
    setRememberCode: (data) => call('setRememberCode', data),
    setAutoStart: (data) => call('setAutoStart', data),
    setAutoStart: (data) => call('setAutoStart', data),
    revealCode: (data) => call('revealCode', data),
    previewCode: (data) => call('previewCode', data),
    createRecoveryKit: (data) => call('createRecoveryKit', data),
    exportArchive: () => call('exportArchive'),
    inspectRecoveryShares: (data) => call('inspectRecoveryShares', data),
    restoreFromRecoveryKit: (data) => call('restoreFromRecoveryKit', data),
    getQuorum: () => call('getQuorum'),
    setQuorum: (data) => call('setQuorum', data),
    scanNodes: async () => {
        if (!window.electronAPI || typeof window.electronAPI.scanNodes !== 'function') return [];
        const nodes = await window.electronAPI.scanNodes();
        return Array.isArray(nodes) ? nodes : [];
    },
    pingNode: async (host, port) => {
        if (!window.electronAPI || typeof window.electronAPI.pingNode !== 'function') return unavailable;
        return await window.electronAPI.pingNode({ host, port });
    },
    countUsers: async () => {
        if (!window.electronAPI || typeof window.electronAPI.getUsersList !== 'function') return 0;
        const result = await window.electronAPI.getUsersList();
        return result && Array.isArray(result.users) ? result.users.length : 0;
    },
    onActivated: (cb) => { const bridge = api(); if (bridge && bridge.onActivated) bridge.onActivated(cb); },
    onDeactivated: (cb) => { const bridge = api(); if (bridge && bridge.onDeactivated) bridge.onDeactivated(cb); },
    onQuorumChanged: (cb) => { const bridge = api(); if (bridge && bridge.onQuorumChanged) bridge.onQuorumChanged(cb); },
    onQuorumLost: (cb) => { const bridge = api(); if (bridge && bridge.onQuorumLost) bridge.onQuorumLost(cb); }
};

export default NetworksService;
