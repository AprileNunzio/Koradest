'use strict';

class IRepository {
    constructor() {
        if (this.constructor === IRepository) {
            throw new Error('Classe astratta IRepository non istanziabile direttamente');
        }
    }

    async getById(id) {
        throw new Error('Metodo getById non implementato');
    }

    async find(filter = {}) {
        throw new Error('Metodo find non implementato');
    }

    async create(entity) {
        throw new Error('Metodo create non implementato');
    }

    async update(id, entity) {
        throw new Error('Metodo update non implementato');
    }

    async delete(id) {
        throw new Error('Metodo delete non implementato');
    }

    async count(filter = {}) {
        throw new Error('Metodo count non implementato');
    }
}

module.exports = IRepository;
