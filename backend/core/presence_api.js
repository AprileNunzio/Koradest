'use strict';

const gossipSub = require('../p2p/protocol/gossipsub');
const { ipcMain } = require('electron');

class PresenceApi {
    constructor() {
        this.TOPIC = 'presence_collab';
    }

    initialize() {
        
        gossipSub.on(this.TOPIC, (payload, sourceNodeId) => {
            const { BrowserWindow } = require('electron');
            if (BrowserWindow) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) {
                        w.webContents.send('presence-event', {
                            nodeId: sourceNodeId,
                            action: payload.action,
                            context: payload.context,
                            timestamp: payload.timestamp
                        });
                    }
                });
            }
        });

        
        if (ipcMain) {
            ipcMain.on('broadcast-presence', (event, data) => {
                const { action, context } = data;
                gossipSub.publish(this.TOPIC, {
                    action,
                    context,
                    timestamp: Date.now()
                });
            });
        }
    }
}

module.exports = new PresenceApi();
