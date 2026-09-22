'use strict';

const { universalEventBus, EventEnvelope, TopicRouter, IdempotencyStore } = require('../backend/core/bus');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

async function testEnvelope() {
    try {
        const secret = 'test-signing-secret-32-characters!!';
        const envelope = EventEnvelope.create({
            id: 'evt-1001',
            source: 'koradest://node1/app/dental',
            type: 'anagrafica.paziente.creato',
            data: { id: 'p1', name: 'Marco' },
            signingKey: secret
        });

        check('Envelope: crea struttura CloudEvents conforme', envelope.specversion === '1.0' && envelope.type === 'anagrafica.paziente.creato');
        check('Envelope: genera firma HMAC valida', typeof envelope.signature === 'string' && envelope.signature.length > 0);

        const isValid = EventEnvelope.verify(envelope, secret);
        check('Envelope: verifica crittografica della firma con esito positivo', isValid === true);

        const isTamperedValid = EventEnvelope.verify(Object.assign({}, envelope, { data: { id: 'p1', name: 'Hacked' } }), secret);
        check('Envelope: manomissione del payload rilevata e respinta', isTamperedValid === false);
    } catch (e) {
        check('testEnvelope error: ' + e.message, false);
    }
}

async function testTopicRouter() {
    try {
        check('TopicRouter: corrispondenza esatta', TopicRouter.matches('paziente.crea', 'paziente.crea') === true);
        check('TopicRouter: mancata corrispondenza', TopicRouter.matches('paziente.crea', 'paziente.aggiorna') === false);
        check('TopicRouter: wildcard singolo livello (*)', TopicRouter.matches('paziente.*.evento', 'paziente.cartella.evento') === true);
        check('TopicRouter: wildcard singolo respinge livelli multipli', TopicRouter.matches('paziente.*', 'paziente.cartella.evento') === false);
        check('TopicRouter: wildcard multilivello (>)', TopicRouter.matches('paziente.>', 'paziente.cartella.visita.creata') === true);
        check('TopicRouter: wildcard totale (>)', TopicRouter.matches('>', 'qualsiasi.cosa.qui') === true);

        const router = new TopicRouter();
        let count = 0;
        const subId = router.subscribe('anagrafica.>', () => { count++; });

        const matches1 = router.findMatchingHandlers('anagrafica.persona.salvata');
        check('TopicRouter: trova subscriber con pattern multilivello', matches1.length === 1);

        router.unsubscribe('anagrafica.>', subId);
        const matches2 = router.findMatchingHandlers('anagrafica.persona.salvata');
        check('TopicRouter: unsubscribe rimuove correttamente il gestore', matches2.length === 0);
    } catch (e) {
        check('testTopicRouter error: ' + e.message, false);
    }
}

async function testIdempotency() {
    try {
        const store = new IdempotencyStore(1000);
        check('Idempotency: evento non visto ritorna false', store.has('evt-999') === false);

        store.mark('evt-999', { ok: true });
        check('Idempotency: evento marcato ritorna true', store.has('evt-999') === true);
        check('Idempotency: recupera risultato memorizzato', store.getResult('evt-999').ok === true);
    } catch (e) {
        check('testIdempotency error: ' + e.message, false);
    }
}

async function testUniversalEventBus() {
    try {
        let receivedPayload = null;
        const unsubscribe = universalEventBus.subscribe('clinica.visita.confermata', async (envelope) => {
            receivedPayload = envelope.data;
            return { processed: true };
        });

        const pubResult = await universalEventBus.publish('clinica.visita.confermata', { appointmentId: 'apt-55' });
        check('UIB: pubblica evento e recapita al subscriber', pubResult.success && receivedPayload && receivedPayload.appointmentId === 'apt-55');

        const dupResult = await universalEventBus.publish('clinica.visita.confermata', { appointmentId: 'apt-55' }, { id: pubResult.eventId });
        check('UIB: riconosce e gestisce evento duplicato tramite IdempotencyStore', dupResult.success && dupResult.duplicate === true);

        if (typeof unsubscribe === 'function') unsubscribe();

        universalEventBus.handleRequest('servizio.somma', async (data) => {
            return (data.a || 0) + (data.b || 0);
        });

        const responseSum = await universalEventBus.request('servizio.somma', { a: 15, b: 27 }, { timeoutMs: 2000 });
        check('UIB: pattern request-reply esegue e restituisce valore', responseSum === 42);

        let timeoutTriggered = false;
        try {
            await universalEventBus.request('servizio.inesistente', { test: true }, { timeoutMs: 50 });
        } catch (timeoutErr) {
            timeoutTriggered = true;
        }
        check('UIB: timeout su richiesta verso topic non gestito', timeoutTriggered === true);
    } catch (e) {
        check('testUniversalEventBus error: ' + e.message, false);
    }
}

async function runAll() {
    try {
        await testEnvelope();
        await testTopicRouter();
        await testIdempotency();
        await testUniversalEventBus();

        if (failures > 0) {
            console.log(`\nTEST FALLITI: ${failures}`);
            process.exit(1);
        } else {
            console.log('\nTUTTI I TEST UNIVERSAL INTEROPERABILITY BUS SUPERATI CON SUCCESSO');
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAll();
