'use strict';
const networksHandlers = require('./networks_handler');

const CHANNELS = {
    'networks:list': () => networksHandlers.list(),
    'networks:getActive': () => networksHandlers.getActive(),
    'networks:create': (e, data) => networksHandlers.create(e, data),
    'networks:join': (e, data) => networksHandlers.join(e, data),
    'networks:activate': (e, data) => networksHandlers.activate(e, data),
    'networks:deactivate': () => networksHandlers.deactivate(),
    'networks:rename': (e, data) => networksHandlers.rename(e, data),
    'networks:remove': (e, data) => networksHandlers.remove(e, data),
    'networks:setRememberCode': (e, data) => networksHandlers.setRememberCode(e, data),
    'networks:setAutoStart': (e, data) => networksHandlers.setAutoStart(e, data),
    'networks:revealCode': (e, data) => networksHandlers.revealCode(e, data),
    'networks:previewCode': (e, data) => networksHandlers.previewCode(e, data),
    'networks:createRecoveryKit': (e, data) => networksHandlers.createRecoveryKit(e, data),
    'networks:exportArchive': (e, data) => networksHandlers.exportArchive(e, data),
    'networks:inspectRecoveryShares': (e, data) => networksHandlers.inspectRecoveryShares(e, data),
    'networks:restoreFromRecoveryKit': (e, data) => networksHandlers.restoreFromRecoveryKit(e, data),
    'networks:getQuorum': () => networksHandlers.getQuorum(),
    'networks:setQuorum': (e, data) => networksHandlers.setQuorum(e, data)
};

function registerNetworkChannels(ipcMain) {
    for (const [channel, handler] of Object.entries(CHANNELS)) {
        ipcMain.removeHandler(channel);
        ipcMain.handle(channel, handler);
    }
    return Object.keys(CHANNELS);
}

module.exports = { registerNetworkChannels, CHANNELS };
