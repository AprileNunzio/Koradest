'use strict';

const {
    autonomousAgentCoordinator,
    SchemaReconciliationAgent,
    SelfHealingWatchdogAgent,
    defineApp
} = require('../backend/agents');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

class MockDbAdapter {
    constructor() {
        try {
            this.version = 0;
            this.executedSql = [];
            this.records = new Map();
        } catch (e) {
            this.version = 0;
            this.executedSql = [];
            this.records = new Map();
        }
    }

    query(sql) {
        try {
            if (sql.includes('PRAGMA user_version')) {
                return [{ user_version: this.version }];
            }
            if (sql.includes('SELECT * FROM test_items WHERE id = ?')) {
                return [];
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    run(sql, params = []) {
        try {
            this.executedSql.push(sql);
            if (sql.includes('PRAGMA user_version =')) {
                const match = sql.match(/PRAGMA user_version = (\d+)/);
                if (match) {
                    this.version = parseInt(match[1], 10);
                }
            }
            if (sql.startsWith('INSERT INTO test_items')) {
                this.records.set(params[0], { id: params[0], val: params[1] });
            }
            return true;
        } catch (e) {
            throw e;
        }
    }
}

async function testSchemaReconciliation() {
    try {
        const adapter = new MockDbAdapter();
        const migrations = [
            { version: 1, sql: 'CREATE TABLE test_table (id TEXT);' },
            { version: 2, sql: 'ALTER TABLE test_table ADD COLUMN name TEXT;' }
        ];

        const schemaAgent = new SchemaReconciliationAgent();
        schemaAgent.registerTarget('test_domain', adapter, migrations);

        const rec1 = await schemaAgent.tick();
        check('SchemaReconciliation: applica migrazioni pendenti e aggiorna schema', rec1.reconciled === 2 && adapter.version === 2);

        const rec2 = await schemaAgent.tick();
        check('SchemaReconciliation: nessun drift rilevato al tick successivo', rec2.reconciled === 0);
    } catch (e) {
        check('testSchemaReconciliation error: ' + e.message, false);
    }
}

async function testSelfHealingWatchdog() {
    try {
        let restartCount = 0;
        const watchdog = new SelfHealingWatchdogAgent();

        watchdog.registerService('worker_billing', {
            maxFailures: 2,
            restartFn: async () => {
                restartCount++;
                return true;
            }
        });

        watchdog.recordFailure('worker_billing', new Error('Out of memory error'));
        check('Watchdog: traccia primo guasto senza riavvio immediato', restartCount === 0);

        watchdog.recordFailure('worker_billing', new Error('Process crash'));
        check('Watchdog: stato CRITICAL dopo superamento soglia guasti', watchdog.getServiceStatus('worker_billing').status === 'CRITICAL');

        const healResult = await watchdog.tick();
        check('Watchdog: auto-guarigione riavvia il servizio e ripristina stato HEALTHY',
            healResult.reconciled === 1 && restartCount === 1 && watchdog.getServiceStatus('worker_billing').status === 'HEALTHY');
    } catch (e) {
        check('testSelfHealingWatchdog error: ' + e.message, false);
    }
}

async function testDeclarativeSdk() {
    try {
        const adapter = new MockDbAdapter();

        const myApp = defineApp({
            id: 'modulo_contabilita',
            name: 'Modulo Contabilita',
            version: '1.0.0',
            actions: {
                'fatture.crea': async (data, ctx) => {
                    await ctx.repo('test_items').create({ id: data.id, val: data.amount });
                    return { created: true, id: data.id };
                },
                'fatture.somma': async (data) => {
                    return (data.a || 0) + (data.b || 0);
                }
            }
        });

        check('DeclarativeAppSdk: crea definizione applicativa conforme', myApp.definition && myApp.definition.id === 'modulo_contabilita');

        const executionSum = await myApp.invokeAction('fatture.somma', { a: 20, b: 30 });
        check('DeclarativeAppSdk: esegue azione con parametri e restituisce esito', executionSum.success && executionSum.data === 50);

        const executionCreate = await myApp.invokeAction('fatture.crea', { id: 'inv_101', amount: 500 }, { dbAdapter: adapter });
        check('DeclarativeAppSdk: inietta repository nel contesto ed esegue scrittura', executionCreate.success && executionCreate.data.created === true && adapter.records.has('inv_101'));
    } catch (e) {
        check('testDeclarativeSdk error: ' + e.message, false);
    }
}

async function testAgentCoordinator() {
    try {
        let ticked = false;
        autonomousAgentCoordinator.registerAgent('test_agent', {
            tick: async () => {
                ticked = true;
                return { reconciled: 1 };
            }
        });

        await autonomousAgentCoordinator.tickAll();
        check('AgentCoordinator: esegue ciclo di controllo su tutti gli agenti registrati', ticked === true);

        const report = autonomousAgentCoordinator.getStatusReport();
        check('AgentCoordinator: genera report di stato per gli agenti registrati', report.test_agent && report.test_agent.status === 'HEALTHY');
    } catch (e) {
        check('testAgentCoordinator error: ' + e.message, false);
    }
}

async function runAll() {
    try {
        await testSchemaReconciliation();
        await testSelfHealingWatchdog();
        await testDeclarativeSdk();
        await testAgentCoordinator();

        if (failures > 0) {
            console.log(`\nTEST FALLITI: ${failures}`);
            process.exit(1);
        } else {
            console.log('\nTUTTI I TEST AUTONOMOUS AGENTS SUPERATI CON SUCCESSO');
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAll();
