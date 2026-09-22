'use strict';

class IUnitOfWork {
    constructor() {
        if (this.constructor === IUnitOfWork) {
            throw new Error('Classe astratta IUnitOfWork non istanziabile direttamente');
        }
    }

    async beginTransaction() {
        throw new Error('Metodo beginTransaction non implementato');
    }

    async commit() {
        throw new Error('Metodo commit non implementato');
    }

    async rollback() {
        throw new Error('Metodo rollback non implementato');
    }

    getRepository(entityName) {
        throw new Error('Metodo getRepository non implementato');
    }
}

module.exports = IUnitOfWork;
