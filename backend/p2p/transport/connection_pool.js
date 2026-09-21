'use strict';
const WebSocket = require('ws');
const _sockets = new Map();
function registerSocket(nodeId, ws) {
    if (!nodeId) return;
    const existing = _sockets.get(nodeId);
    if (existing && existing.readyState === WebSocket.OPEN) existing.close();
    ws.on('close', () => { if (_sockets.get(nodeId) === ws) _sockets.delete(nodeId); });
    _sockets.set(nodeId, ws);
}
function getSocket(nodeId) {
    if (!nodeId) return null;
    const ws = _sockets.get(nodeId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        const webrtcNode = require('./webrtc_node');
        if (webrtcNode.peers.has(nodeId) && webrtcNode.peers.get(nodeId).state === 'connected') {
            return {
                readyState: WebSocket.OPEN,
                send: (data) => webrtcNode.send(nodeId, data),
                close: () => {}
            };
        }
        return null;
    }
    
    return ws;
}
function getAll() { return _sockets; }
function closeAll() {
    for (const ws of _sockets.values()) { try { ws.close(); } catch (_) {} }
    _sockets.clear();
}
module.exports = { registerSocket, getSocket, getAll, closeAll };
