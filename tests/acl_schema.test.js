'use strict';

const { SqliteRepository, SqliteUnitOfWork } = require('../backend/db/DAL');
const { schemaRegistry, FallbackCircuitBreaker, antiCorruptionGateway } = require('../backend/db/ACL');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

class MemoryDbAdapter {
    constructor() {
        try {
            this.tables = new Map();
            this.transactionBackup = null;
        } catch (e) {
            this.tables = new Map();
        }
    }

    _getTable(tableName) {
        try {
            if (!this.tables.has(tableName)) {
                this.tables.set(tableName, new Map());
            }
            return this.tables.get(tableName);
        } catch (e) {
            return new Map();
        }
    }

    query(sql, params = []) {
        try {
            if (sql.includes('SELECT * FROM users_test WHERE id = ?')) {
                const table = this._getTable('users_test');
                const row = table.get(params[0]);
                return row ? [Object.assign({}, row)] : [];
            }
            if (sql.includes('SELECT * FROM users_test WHERE role = ?')) {
                const table = this._getTable('users_test');
                const matched = [];
                for (const row of table.values()) {
                    if (row.role === params[0]) matched.push(Object.assign({}, row));
                }
                return matched;
            }
            if (sql.includes('SELECT COUNT(*) AS total FROM users_test WHERE role = ?')) {
                const table = this._getTable('users_test');
                let count = 0;
                for (const row of table.values()) {
                    if (row.role === params[0]) count++;
                }
                return [{ total: count }];
            }
            if (sql.includes('SELECT * FROM logs_test WHERE id = ?')) {
                const table = this._getTable('logs_test');
                const row = table.get(params[0]);
                return row ? [Object.assign({}, row)] : [];
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    run(sql, params = []) {
        try {
            if (sql.startsWith('BEGIN TRANSACTION')) {
                const backup = new Map();
                for (const [tName, tMap] of this.tables.entries()) {
                    const mapCopy = new Map();
                    for (const [k, v] of tMap.entries()) {
                        mapCopy.set(k, Object.assign({}, v));
                    }
                    backup.set(tName, mapCopy);
                }
                this.transactionBackup = backup;
                return true;
            }
            if (sql.startsWith('COMMIT')) {
                this.transactionBackup = null;
                return true;
            }
            if (sql.startsWith('ROLLBACK')) {
                if (this.transactionBackup) {
                    this.tables = this.transactionBackup;
                    this.transactionBackup = null;
                }
                return true;
            }
            if (sql.startsWith('INSERT INTO users_test')) {
                const table = this._getTable('users_test');
                const record = { id: params[0], name: params[1], role: params[2], active: params[3] };
                table.set(record.id, record);
                return true;
            }
            if (sql.startsWith('INSERT INTO logs_test')) {
                const table = this._getTable('logs_test');
                const record = { id: params[0], message: params[1] };
                table.set(record.id, record);
                return true;
            }
            if (sql.startsWith('UPDATE users_test SET name = ? WHERE id = ?')) {
                const table = this._getTable('users_test');
                const existing = table.get(params[1]);
                if (existing) {
                    existing.name = params[0];
                }
                return true;
            }
            if (sql.startsWith('DELETE FROM users_test WHERE id = ?')) {
                const table = this._getTable('users_test');
                table.delete(params[0]);
                return true;
            }
            return true;
        } catch (e) {
            throw e;
        }
    }

    execute(sql, params = []) {
        try {
            return this.run(sql, params);
        } catch (e) {
            throw e;
        }
    }
}

async function testDal() {
    try {
        const adapter = new MemoryDbAdapter();
        const repo = new SqliteRepository('users_test', adapter);

        await repo.create({ id: 'u1', name: 'Mario Rossi', role: 'admin', active: 1 });
        const user = await repo.getById('u1');
        check('DAL: record inserito e recuperato correttamente', user && user.name === 'Mario Rossi');

        await repo.update('u1', { name: 'Mario Bianchi' });
        const updated = await repo.getById('u1');
        check('DAL: record aggiornato correttamente', updated && updated.name === 'Mario Bianchi');

        const allUsers = await repo.find({ role: 'admin' });
        check('DAL: find filtra correttamente per ruolo', allUsers.length === 1);

        const count = await repo.count({ role: 'admin' });
        check('DAL: count calcola il totale corretto', count === 1);

        await repo.delete('u1');
        const deleted = await repo.getById('u1');
        check('DAL: delete elimina il record', deleted === null);

        const uow = new SqliteUnitOfWork(adapter);
        const uowUsers = uow.getRepository('users_test');
        const uowLogs = uow.getRepository('logs_test');

        await uow.beginTransaction();
        await uowUsers.create({ id: 'u2', name: 'Giuseppe Verdi', role: 'doctor', active: 1 });
        await uowLogs.create({ id: 'l1', message: 'Utente u2 creato' });
        await uow.commit();

        const committedUser = await uowUsers.getById('u2');
        const committedLog = await uowLogs.getById('l1');
        check('DAL UnitOfWork: transazione completata con successo', committedUser !== null && committedLog !== null);

        await uow.beginTransaction();
        await uowUsers.create({ id: 'u3', name: 'Luigi Neri', role: 'nurse', active: 1 });
        await uow.rollback();

        const rolledBackUser = await uowUsers.getById('u3');
        check('DAL UnitOfWork: rollback annulla correttamente le modifiche', rolledBackUser === null);
    } catch (e) {
        check('DAL execution error: ' + e.message, false);
    }
}

async function testAclSchemaRegistry() {
    try {
        const validPerson = {
            id: 'p_001',
            firstName: '  Anna  ',
            lastName: 'Verdi',
            taxCode: 'VRDNNA80A01H501U',
            birthDate: '1980-01-01',
            email: 'anna.verdi@example.com'
        };

        const resValid = schemaRegistry.validateAndNormalize('CanonicalPerson', validPerson);
        check('ACL SchemaRegistry: valida e normalizza entita conforme', resValid.valid && resValid.data.firstName === 'Anna');

        const invalidPerson = {
            id: 'p_002',
            firstName: 'Carlo'
        };
        const resInvalid = schemaRegistry.validateAndNormalize('CanonicalPerson', invalidPerson);
        check('ACL SchemaRegistry: rifiuta entita priva di campi obbligatori', !resInvalid.valid && resInvalid.errors.length > 0);
    } catch (e) {
        check('ACL SchemaRegistry error: ' + e.message, false);
    }
}

async function testFallbackCircuitBreaker() {
    try {
        const breaker = new FallbackCircuitBreaker({ failureThreshold: 2, recoveryTimeMs: 50, autoSnapshot: false });
        breaker.setSnapshot('vendor_test_key', { fallback: true, count: 42 });

        const okResult = await breaker.execute('vendor_test_key', async () => ({ value: 100 }));
        check('CircuitBreaker: esecuzione normale con stato CLOSED', okResult.success && okResult.data.value === 100);

        await breaker.execute('vendor_test_key', async () => { throw new Error('Simulated Fail 1'); });
        const secondFail = await breaker.execute('vendor_test_key', async () => { throw new Error('Simulated Fail 2'); });

        check('CircuitBreaker: scatta fallback dopo errori ripetuti', secondFail.success && secondFail.fromFallback && secondFail.data.count === 42);
        check('CircuitBreaker: stato OPEN registrato', breaker.getState() === 'OPEN');
    } catch (e) {
        check('CircuitBreaker error: ' + e.message, false);
    }
}

async function testAntiCorruptionGateway() {
    try {
        const vendorExternalData = {
            codice_paziente: 'EXT-9988',
            nome_completo: 'Dott. Mario Rossi',
            data_nascita: '1975-05-12',
            cf: 'RSSMRA75E12H501Z',
            recapito: 'mario.rossi@vendor.it'
        };

        antiCorruptionGateway.registerAdapter('vendor_external_system', {
            canonicalSchema: 'CanonicalPerson',
            toCanonical: async (ext) => {
                const parts = ext.nome_completo.replace(/^Dott\.\s*/, '').split(' ');
                return {
                    id: ext.codice_paziente,
                    firstName: parts[0] || '',
                    lastName: parts.slice(1).join(' ') || '',
                    taxCode: ext.cf,
                    birthDate: ext.data_nascita,
                    email: ext.recapito
                };
            },
            toExternal: async (can) => {
                return {
                    codice_paziente: can.id,
                    nome_completo: `${can.firstName} ${can.lastName}`,
                    cf: can.taxCode,
                    data_nascita: can.birthDate,
                    recapito: can.email
                };
            }
        });

        const ingestResult = await antiCorruptionGateway.ingest('vendor_external_system', vendorExternalData, { entityId: '9988' });
        check('AC Gateway Ingest: converte payload vendor in CanonicalPerson', ingestResult.success && ingestResult.canonicalData.firstName === 'Mario' && ingestResult.canonicalData.lastName === 'Rossi');

        const egressResult = await antiCorruptionGateway.egress('vendor_external_system', ingestResult.canonicalData);
        check('AC Gateway Egress: riconverte CanonicalPerson in formato vendor', egressResult.success && egressResult.externalData.codice_paziente === 'EXT-9988');

        const malformedVendorData = null;
        const failedIngest = await antiCorruptionGateway.ingest('vendor_external_system', malformedVendorData);
        check('AC Gateway: gestisce payload vendor malformato senza crash', !failedIngest.success);
    } catch (e) {
        check('AntiCorruptionGateway error: ' + e.message, false);
    }
}

async function runAll() {
    try {
        await testDal();
        await testAclSchemaRegistry();
        await testFallbackCircuitBreaker();
        await testAntiCorruptionGateway();

        if (failures > 0) {
            console.log(`\nTEST FALLITI: ${failures}`);
            process.exit(1);
        } else {
            console.log('\nTUTTI I TEST DAL E ACL SUPERATI CON SUCCESSO');
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAll();
