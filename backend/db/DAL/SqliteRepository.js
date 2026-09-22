'use strict';

const IRepository = require('./IRepository');

class SqliteRepository extends IRepository {
    constructor(tableName, dbAdapter, options = {}) {
        super();
        try {
            if (!tableName || typeof tableName !== 'string') {
                throw new Error('tableName obbligatorio');
            }
            if (!dbAdapter) {
                throw new Error('dbAdapter obbligatorio');
            }
            this.tableName = tableName;
            this.adapter = dbAdapter;
            this.primaryKey = options.primaryKey || 'id';
        } catch (e) {
            throw e;
        }
    }

    async getById(id) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ? LIMIT 1;`;
            const rows = this.adapter.query ? this.adapter.query(sql, [id]) : [];
            return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        } catch (e) {
            return null;
        }
    }

    async find(filter = {}, options = {}) {
        try {
            const keys = Object.keys(filter);
            const whereParts = [];
            const params = [];

            for (const key of keys) {
                if (filter[key] !== undefined) {
                    whereParts.push(`${key} = ?`);
                    params.push(filter[key]);
                }
            }

            let sql = `SELECT * FROM ${this.tableName}`;
            if (whereParts.length > 0) {
                sql += ` WHERE ${whereParts.join(' AND ')}`;
            }

            if (options.orderBy) {
                sql += ` ORDER BY ${options.orderBy}`;
            }

            if (Number.isInteger(options.limit) && options.limit > 0) {
                sql += ` LIMIT ${options.limit}`;
                if (Number.isInteger(options.offset) && options.offset >= 0) {
                    sql += ` OFFSET ${options.offset}`;
                }
            }

            const rows = this.adapter.query ? this.adapter.query(sql, params) : [];
            return Array.isArray(rows) ? rows : [];
        } catch (e) {
            return [];
        }
    }

    async create(entity) {
        try {
            if (!entity || typeof entity !== 'object') {
                throw new Error('Entity non valida per create');
            }
            const keys = Object.keys(entity);
            if (keys.length === 0) {
                throw new Error('Nessun campo specificato per l inserimento');
            }

            const columns = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => entity[k]);

            const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders});`;
            if (this.adapter.run) {
                this.adapter.run(sql, values);
            } else if (this.adapter.execute) {
                this.adapter.execute(sql, values);
            }

            return entity[this.primaryKey] !== undefined ? entity[this.primaryKey] : true;
        } catch (e) {
            throw e;
        }
    }

    async update(id, entity) {
        try {
            if (!id) {
                throw new Error('ID obbligatorio per update');
            }
            if (!entity || typeof entity !== 'object') {
                throw new Error('Entity non valida per update');
            }

            const keys = Object.keys(entity).filter(k => k !== this.primaryKey);
            if (keys.length === 0) {
                return false;
            }

            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => entity[k]);
            values.push(id);

            const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?;`;
            if (this.adapter.run) {
                this.adapter.run(sql, values);
            } else if (this.adapter.execute) {
                this.adapter.execute(sql, values);
            }

            return true;
        } catch (e) {
            throw e;
        }
    }

    async delete(id) {
        try {
            if (!id) {
                throw new Error('ID obbligatorio per delete');
            }
            const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?;`;
            if (this.adapter.run) {
                this.adapter.run(sql, [id]);
            } else if (this.adapter.execute) {
                this.adapter.execute(sql, [id]);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async count(filter = {}) {
        try {
            const keys = Object.keys(filter);
            const whereParts = [];
            const params = [];

            for (const key of keys) {
                if (filter[key] !== undefined) {
                    whereParts.push(`${key} = ?`);
                    params.push(filter[key]);
                }
            }

            let sql = `SELECT COUNT(*) AS total FROM ${this.tableName}`;
            if (whereParts.length > 0) {
                sql += ` WHERE ${whereParts.join(' AND ')}`;
            }

            const rows = this.adapter.query ? this.adapter.query(sql, params) : [];
            return Array.isArray(rows) && rows.length > 0 ? Number(rows[0].total) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }
}

module.exports = SqliteRepository;
