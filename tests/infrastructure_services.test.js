'use strict';

const {
    communicationGateway,
    AirGappedMockProvider,
    WebPushProvider
} = require('../backend/infrastructure');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

async function testProviderRegistrationAndDispatch() {
    try {
        const mockEmail = new AirGappedMockProvider('email');
        const mockSms = new AirGappedMockProvider('sms');
        const pushProvider = new WebPushProvider();

        communicationGateway.registerProvider(mockEmail, true);
        communicationGateway.registerProvider(mockSms, true);
        communicationGateway.registerProvider(pushProvider, true);

        const emailResult = await communicationGateway.send('email', {
            to: 'utente@example.it',
            subject: 'Notifica Visita',
            text: 'Promemoria appuntamento'
        });
        check('Infrastructure: invio email tramite provider agnostico riuscito', emailResult.success && emailResult.airGapped === true);

        const smsResult = await communicationGateway.send('sms', {
            to: '+393331234567',
            message: 'Il tuo codice di verifica e 994821'
        });
        check('Infrastructure: invio SMS tramite provider agnostico riuscito', smsResult.success && smsResult.airGapped === true);

        const pushResult = await communicationGateway.send('push', {
            recipient: 'user_44',
            title: 'Nuovo Documento'
        });
        check('Infrastructure: notifica push inviata con ID generato', pushResult.success && typeof pushResult.messageId === 'string');
    } catch (e) {
        check('testProviderRegistrationAndDispatch error: ' + e.message, false);
    }
}

async function testSpoolAndResilience() {
    try {
        class FlakyProvider {
            constructor() {
                try {
                    this.shouldFail = true;
                    this.received = [];
                } catch (e) {
                    this.shouldFail = true;
                    this.received = [];
                }
            }
            getChannel() { return 'fax'; }
            getProviderId() { return 'flaky_fax'; }
            async send(req) {
                try {
                    if (this.shouldFail) {
                        return { success: false, error: 'Linea occupata o guasto temporaneo' };
                    }
                    this.received.push(req);
                    return { success: true, messageId: 'fax_ok_1' };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
            async healthCheck() {
                return { healthy: !this.shouldFail };
            }
        }

        const flaky = new FlakyProvider();
        communicationGateway.registerProvider(flaky, true);

        const initialSend = await communicationGateway.send('fax', { number: '06123456' }, { queueOnFailure: true });
        check('Infrastructure Spool: messaggio con errore accodato nello spool resiliente', initialSend.success && initialSend.queued === true);
        check('Infrastructure Spool: coda contiene 1 elemento pendente', communicationGateway.getSpoolSize() >= 1);

        flaky.shouldFail = false;
        const spoolRun = await communicationGateway.processSpool();
        check('Infrastructure Spool: processamento spool svuota la coda dopo ripristino linea', spoolRun.processed >= 1 && communicationGateway.getSpoolSize() === 0);
    } catch (e) {
        check('testSpoolAndResilience error: ' + e.message, false);
    }
}

async function testHealthCheck() {
    try {
        const report = await communicationGateway.healthCheckAll();
        check('Infrastructure Health: report diagnostico generato per tutti i canali', report.email && report.sms && report.push);
    } catch (e) {
        check('testHealthCheck error: ' + e.message, false);
    }
}

async function runAll() {
    try {
        await testProviderRegistrationAndDispatch();
        await testSpoolAndResilience();
        await testHealthCheck();

        if (failures > 0) {
            console.log(`\nTEST FALLITI: ${failures}`);
            process.exit(1);
        } else {
            console.log('\nTUTTI I TEST INFRASTRUCTURE SERVICES SUPERATI CON SUCCESSO');
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAll();
