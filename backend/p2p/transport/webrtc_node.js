'use strict';

const events = require('events');



class WebRTCNode extends events.EventEmitter {
    constructor() {
        super();
        this.peers = new Map();
        
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];
    }

    createOffer(peerId) {
        
        const offer = { type: 'offer', sdp: `v=0\no=- 461173...` };
        this.peers.set(peerId, { state: 'connecting', sdp: offer });
        return offer;
    }

    acceptAnswer(peerId, answer) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.state = 'connected';
            this.emit('connected', peerId);
            return true;
        }
        return false;
    }

    send(peerId, data) {
        const peer = this.peers.get(peerId);
        if (!peer || peer.state !== 'connected') {
            throw new Error(`Impossibile inviare dati WebRTC: peer ${peerId} disconnesso o non trovato`);
        }
        
        this.emit('simulated_send', peerId, data);
    }
}

module.exports = new WebRTCNode();
