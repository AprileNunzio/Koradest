'use strict';
const dgram = require('dgram');
const os = require('os');
const bus = require('../../core/event_bus');
const VIRTUAL_ADAPTER_PATTERNS = [
    /hyper-v/i, /virtualbox/i, /vmware/i, /vethernet/i,
    /loopback/i, /teredo/i, /isatap/i, /6to4/i, /wsl/i,
    /tap-windows/i, /cisco/i, /nordvpn/i, /expressvpn/i, /openvpn/i
];
function getPhysicalSubnets() {
    const interfaces = os.networkInterfaces();
    const subnets = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
        if (VIRTUAL_ADAPTER_PATTERNS.some(p => p.test(name))) continue;
        for (const iface of addrs) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const parts = iface.address.split('.');
                parts.pop();
                subnets.push({ subnet: parts.join('.'), address: iface.address });
            }
        }
    }
    if (subnets.length === 0) {
        for (const addrs of Object.values(interfaces)) {
            for (const iface of addrs) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const parts = iface.address.split('.');
                    parts.pop();
                    subnets.push({ subnet: parts.join('.'), address: iface.address });
                }
            }
        }
    }
    return subnets;
}
function activePublicId() {
    try {
        return require('../../networks/session/network_session').getActivePublicId();
    } catch (_) {
        return null;
    }
}
function isSameNetwork(remotePublicId) {
    const local = activePublicId();
    if (!local || !remotePublicId) return false;
    return local === remotePublicId;
}
function accettaPeer(remotePublicId, scoped) {
    if (!scoped) return true;
    return isSameNetwork(remotePublicId);
}
function broadcast(message, udpPort, timeoutMs = 1500, scoped = true) {
    return new Promise((resolve) => {
        const found = [];
        let client;
        try { client = dgram.createSocket({ type: 'udp4', reuseAddr: true }); } catch (_) { return resolve(found); }
        client.on('error', () => { try { client.close(); } catch (_) {} resolve(found); });
        client.on('message', (msg, rinfo) => {
            const str = msg.toString();
            if (!str.startsWith('I_AM_KORADEST:')) return;
            const parts = str.split(':');
            const peer = { ip: rinfo.address, name: parts[1] || 'Nodo KORADEST', displayName: parts[1] || 'Nodo KORADEST', port: parseInt(parts[2]) || 34567, protocolVersion: parseInt(parts[3]) || 0, nodeId: parts[4] || null, updateReadyVersion: parts[5] || null, networkPublicId: parts[6] || null };
            if (!accettaPeer(peer.networkPublicId, scoped)) return;
            found.push(peer);
            if (scoped) bus.publish('peer:discovered', { ...peer, source: 'udp' });
        });
        client.bind(() => {
            try {
                client.setBroadcast(true);
                const msgBuf = Buffer.from(message);
                const targets = [...new Set([...getPhysicalSubnets().map(s => `${s.subnet}.255`), '255.255.255.255'])];
                for (const target of targets) {
                    client.send(msgBuf, 0, msgBuf.length, udpPort, target, (err) => {
                        if (err && !['EACCES', 'EHOSTUNREACH', 'ENETUNREACH'].includes(err.code)) {
                            console.warn(`[UdpBroadcaster] ${target}:`, err.message);
                        }
                    });
                }
            } catch (_) { resolve(found); }
        });
        setTimeout(() => { try { client.close(); } catch (_) {} resolve(found); }, timeoutMs);
    });
}
function startUdpListener(udpPort, localNodeIdFn, localNameFn, protocolVersion, onUpdateAvailable, onForceResync, tcpPortFn, onAppUpdate) {
    const server = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    server.on('error', (err) => { console.error('[UdpBroadcaster] Server error:', err.message); });
    server.on('message', (msg, rinfo) => {
        try {
            const str = msg.toString();
            if (str.startsWith('DISCOVER_KORADEST')) {
                const myNodeId = localNodeIdFn();
                const advertisedPort = typeof tcpPortFn === 'function' ? tcpPortFn() : 34567;
                let updateVer = '';
                try { updateVer = require('../../core/updaterService').getPendingUpdateVersion() || ''; } catch (_) {}
                let publicId = '';
                try { publicId = require('../../networks/session/network_session').getActivePublicId() || ''; } catch (_) {}
                if (!publicId) return;
                const reply = Buffer.from(`I_AM_KORADEST:${localNameFn()}:${advertisedPort}:${protocolVersion}:${myNodeId}:${updateVer}:${publicId}`);
                server.send(reply, 0, reply.length, rinfo.port, rinfo.address);
                if (str.includes(':')) {
                    const p = str.split(':');
                    bus.publish('peer:discovered', { ip: rinfo.address, name: p[1] || 'Nodo KORADEST', displayName: p[1] || 'Nodo KORADEST', port: parseInt(p[2]) || 34567, protocolVersion: parseInt(p[3]) || 0, nodeId: p[4] || null, source: 'udp-passive' });
                }
            } else if (str.startsWith('I_AM_KORADEST:')) {
                const p = str.split(':');
                if (!accettaPeer(p[6] || null, Boolean(activePublicId()))) return;
                bus.publish('peer:discovered', { ip: rinfo.address, name: p[1] || 'Nodo KORADEST', displayName: p[1] || 'Nodo KORADEST', port: parseInt(p[2]) || 34567, protocolVersion: parseInt(p[3]) || 0, nodeId: p[4] || null, updateReadyVersion: p[5] || null, networkPublicId: p[6] || null, source: 'udp-passive' });
            } else if (str.startsWith('UPDATE_AVAILABLE_P2P:') && onUpdateAvailable) {
                const p = str.split(':');
                const version = p[1];
                if (version && /^\d+\.\d+\.\d+$/.test(version)) {
                    onUpdateAvailable(version, p[2] || rinfo.address);
                }
            } else if (str.startsWith('APP_UPDATED_P2P:') && onAppUpdate) {
                const p = str.split(':');
                const token = p[1] || '';
                const appId = p[2] || '';
                const version = p[3] || '';
                if (token && /^[a-z0-9_.-]{1,64}$/i.test(appId) && /^\d+\.\d+\.\d+$/.test(version)) {
                    onAppUpdate(token, appId, version, rinfo.address);
                }
            } else if (str.startsWith('FORCE_RESYNC_P2P') && onForceResync) {
                const token = str.startsWith('FORCE_RESYNC_P2P:') ? str.slice('FORCE_RESYNC_P2P:'.length) : '';
                onForceResync(rinfo.address, token);
            }
        } catch (_) {}
    });
    server.bind(udpPort, () => console.log(`[UdpBroadcaster] Listener attivo su UDP:${udpPort}`));
    return server;
}
module.exports = { broadcast, getPhysicalSubnets, startUdpListener, isSameNetwork, accettaPeer, activePublicId };
