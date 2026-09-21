'use strict';

const events = require('events');
const crypto = require('crypto');
const nodeKeypair = require('../../security/node_keypair');

class GossipSub extends events.EventEmitter {
    constructor() {
        super();
        this.seenMessages = new Set();
        
        setInterval(() => this.seenMessages.clear(), 300000); 
    }

    _signMessage(topic, payload) {
        const msgStr = JSON.stringify({ topic, payload });
        return {
            id: crypto.randomUUID(),
            topic,
            payload,
            nodeId: require('../../core/node_identity').getNodeId(),
            timestamp: Date.now(),
            signature: nodeKeypair.sign(Buffer.from(msgStr))
        };
    }

    _verifyMessage(envelope) {
        const pkiCa = require('../../security/pki_ca');
        const signer = require('../../dag/block/block_signer');
        const pubKey = signer.getKey(envelope.nodeId);
        
        if (!pubKey) return false;
        const msgStr = JSON.stringify({ topic: envelope.topic, payload: envelope.payload });
        return nodeKeypair.verify(pubKey, Buffer.from(msgStr), envelope.signature);
    }

    publish(topic, payload) {
        const envelope = this._signMessage(topic, payload);
        this._broadcast(envelope);
    }

    _broadcast(envelope) {
        
        if (this.seenMessages.has(envelope.id)) return;
        this.seenMessages.add(envelope.id);

        const connectionPool = require('../../p2p/transport/connection_pool');
        const sockets = connectionPool.getAll();
        const wireMessage = JSON.stringify({ type: 'GOSSIP_SUB', data: envelope });

        for (const [nodeId, ws] of sockets.entries()) {
            if (nodeId === envelope.nodeId) continue;
            if (ws.readyState === 1) { 
                try {
                    ws.send(wireMessage);
                } catch (e) {}
            }
        }
    }

    handleIncomingGossip(envelope) {
        if (!envelope || !envelope.id || this.seenMessages.has(envelope.id)) return;
        
        if (!this._verifyMessage(envelope)) {
            return; 
        }

        this.seenMessages.add(envelope.id);
        
        
        this.emit(envelope.topic, envelope.payload, envelope.nodeId);

        
        this._broadcast(envelope);
    }
}

module.exports = new GossipSub();
