'use strict';

const IUnitOfWork = require('./IUnitOfWork');
const SqliteRepository = require('./SqliteRepository');

class SqliteUnitOfWork extends IUnitOfWork {
    constructor(dbAdapter) {
        super();
        try {
            if (!dbAdapter) {
                throw new Error('dbAdapter obbligatorio per SqliteUnitOfWork');
            }
            this.adapter = dbAdapter;
            this.repositories = new Map();
            this.inTransaction = false;
        } catch (e) {
            throw e;
        }
    }

    getRepository(tableName, options = {}) {
        try {
            if (!this.repositories.has(tableName)) {
                const repo = new SqliteRepository(tableName, this.adapter, options);
                this.repositories.set(tableName, repo);
            }
            return this.repositories.get(tableName);
        } catch (e) {
            return null;
        }
    }

    async beginTransaction() {
        try {
            if (this.inTransaction) {
                return false;
            }
            if (this.adapter.run) {
                this.adapter.run('BEGIN TRANSACTION;');
            } else if (this.adapter.execute) {
                this.adapter.execute('BEGIN TRANSACTION;');
            }
            this.inTransaction = true;
            return true;
        } catch (e) {
            this.inTransaction = false;
            return false;
        }
    }

    async commit() {
        try {
            if (!this.inTransaction) {
                return false;
            }
            if (this.adapter.run) {
                this.adapter.run('COMMIT;');
            } else if (this.adapter.execute) {
                this.adapter.execute('COMMIT;');
            }
            this.inTransaction = false;
            return true;
        } catch (e) {
            await this.rollback();
            return false;
        }
    }

    async rollback() {
        try {
            if (!this.inTransaction) {
                return false;
            }
            if (this.adapter.run) {
                this.adapter.run('ROLLBACK;');
            } else if (this.adapter.execute) {
                this.adapter.execute('ROLLBACK;');
            }
            this.inTransaction = false;
            return true;
        } catch (e) {
            this.inTransaction = false;
            return false;
        }
    }
}

module.exports = SqliteUnitOfWork;
