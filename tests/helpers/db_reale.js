'use strict';
const { DatabaseSync } = require('node:sqlite');

function creaAdattatore() {
    const db = new DatabaseSync(':memory:');
    return {
        _db: db,
        query(sql, params = []) {
            return db.prepare(sql).all(...(Array.isArray(params) ? params : [params]));
        },
        run(sql, params = []) {
            return db.prepare(sql).run(...(Array.isArray(params) ? params : [params]));
        },
        execute(sql, params = []) {
            if (!params || params.length === 0) {
                db.exec(sql);
                return true;
            }
            db.prepare(sql).run(...params);
            return true;
        },
        exec(sql) {
            db.exec(sql);
            return true;
        }
    };
}

function applicaMigrazioni(adattatore, migrazioni) {
    for (const migrazione of migrazioni) {
        if (typeof migrazione.sql === 'string' && migrazione.sql.trim()) {
            adattatore.exec(migrazione.sql);
        }
    }
}

function creaAmbiente(domini) {
    const database = {};
    for (const [dominio, migrazioni] of Object.entries(domini)) {
        database[dominio] = creaAdattatore();
        applicaMigrazioni(database[dominio], migrazioni);
    }
    const blocchiCreati = [];
    const stub = {
        getDB(dominio = 'auth') {
            const scelto = database[dominio];
            if (!scelto) throw new Error('DB_NOT_INITIALIZED');
            return scelto;
        },
        async saveDB() { return true; },
        notifyDataChanged() { return true; },
        wrapMutationWithEvent(eventType, tableName, recordId, payload) {
            blocchiCreati.push({ eventType, tableName, recordId, payload });
        },
        hashNetworkCode: () => '',
        checkIsRegistered: () => true
    };
    return { database, stub, blocchiCreati };
}

module.exports = { creaAdattatore, applicaMigrazioni, creaAmbiente };
