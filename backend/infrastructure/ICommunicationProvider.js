'use strict';

class ICommunicationProvider {
    constructor() {
        if (this.constructor === ICommunicationProvider) {
            throw new Error('Classe astratta ICommunicationProvider non istanziabile direttamente');
        }
    }

    getChannel() {
        throw new Error('Metodo getChannel non implementato');
    }

    getProviderId() {
        throw new Error('Metodo getProviderId non implementato');
    }

    async send(request) {
        throw new Error('Metodo send non implementato');
    }

    async healthCheck() {
        throw new Error('Metodo healthCheck non implementato');
    }
}

module.exports = ICommunicationProvider;
