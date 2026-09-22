'use strict';

const {
    zeroTrustPolicyEngine,
    IpcHmacGuard,
    MtlsClusterBridge
} = require('../backend/security/zerotrust');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

async function testPolicyEngine() {
    try {
        const adminSubject = { id: 'admin_user', roles: ['admin'] };
        const adminEval = await zeroTrustPolicyEngine.evaluate({
            subject: adminSubject,
            action: 'delete',
            resource: 'cartella_clinica'
        });
        check('ZeroTrust: amministratore ha accesso autorizzato (admin_override)', adminEval.allowed === true);

        const standardSubject = {
            id: 'doc_1',
            roles: ['docente'],
            permissions: ['viaggi:lettura', 'alunni:alunni.elenco']
        };

        const allowedEval = await zeroTrustPolicyEngine.evaluate({
            subject: standardSubject,
            action: 'lettura',
            resource: 'viaggi'
        });
        check('ZeroTrust: permesso corrispondente concesso con Least Privilege', allowedEval.allowed === true);

        const deniedEval = await zeroTrustPolicyEngine.evaluate({
            subject: standardSubject,
            action: 'scrittura',
            resource: 'viaggi'
        });
        check('ZeroTrust: permesso non dichiarato respinto', deniedEval.allowed === false);

        const expiredSubject = {
            id: 'user_exp',
            tokenExpiresAt: Date.now() - 5000,
            roles: ['utente'],
            permissions: ['*']
        };
        const expiredEval = await zeroTrustPolicyEngine.evaluate({
            subject: expiredSubject,
            action: 'lettura',
            resource: 'note'
        });
        check('ZeroTrust: token scaduto respinto prima della valutazione permessi', expiredEval.allowed === false);

        zeroTrustPolicyEngine.registerPolicy('sensibile:*', (subject, action, resource, env) => {
            if (env.isLocalNode === true) {
                return { allowed: true };
            }
            return { allowed: false, reason: 'Accesso ai dati sensibili consentito solo da postazione locale' };
        });

        const localEval = await zeroTrustPolicyEngine.evaluate({
            subject: { id: 'operatore', roles: ['operatore'] },
            action: 'visualizza',
            resource: 'sensibile:referto',
            environment: { isLocalNode: true }
        });
        check('ZeroTrust: policy dinamica basata su contesto ambientale (locale) convalidata', localEval.allowed === true);

        const remoteEval = await zeroTrustPolicyEngine.evaluate({
            subject: { id: 'operatore', roles: ['operatore'] },
            action: 'visualizza',
            resource: 'sensibile:referto',
            environment: { isLocalNode: false }
        });
        check('ZeroTrust: policy dinamica respinge richiesta remota non autorizzata', remoteEval.allowed === false);
    } catch (e) {
        check('testPolicyEngine error: ' + e.message, false);
    }
}

async function testIpcHmacGuard() {
    try {
        const secret = 'super-secret-app-session-token-32!';
        const payload = { action: 'pazienti.salva', patientId: 'p-101' };

        const signed = IpcHmacGuard.signMessage(payload, secret, 'app_dental');
        check('IpcHmacGuard: messaggio firmato crittograficamente con nonce e timestamp', signed && signed.hmac && signed.nonce);

        const validRes = IpcHmacGuard.verifyMessage(signed, secret, 10000);
        check('IpcHmacGuard: firma valida verificata con successo', validRes.valid === true && validRes.payload.patientId === 'p-101');

        const tampered = Object.assign({}, signed, {
            payload: { action: 'pazienti.salva', patientId: 'p-999_infiltrated' }
        });
        const tamperedRes = IpcHmacGuard.verifyMessage(tampered, secret, 10000);
        check('IpcHmacGuard: manomissione del payload rilevata e bloccata', tamperedRes.valid === false);

        const expired = Object.assign({}, signed, { timestamp: Date.now() - 20000 });
        const expiredRes = IpcHmacGuard.verifyMessage(expired, secret, 5000);
        check('IpcHmacGuard: messaggio oltre finestra temporale respinto (anti-replay)', expiredRes.valid === false);
    } catch (e) {
        check('testIpcHmacGuard error: ' + e.message, false);
    }
}

async function testMtlsClusterBridge() {
    try {
        const dummyKey = 'dummy-key';
        const dummyCert = 'dummy-cert';
        const dummyCa = 'dummy-ca';

        const serverConfig = MtlsClusterBridge.createServerConfig({
            key: dummyKey,
            cert: dummyCert,
            ca: dummyCa,
            verifyNodeIdFn: (cert) => cert && cert.subject && cert.subject.CN === 'node-alpha'
        });

        check('MtlsClusterBridge: configurazione server impone TLS 1.3 e autenticazione mutuale',
            serverConfig.minVersion === 'TLSv1.3' && serverConfig.requestCert === true && serverConfig.rejectUnauthorized === true);

        const validNodeErr = serverConfig.checkServerIdentity('dummyHost', { subject: { CN: 'node-alpha' } });
        check('MtlsClusterBridge: certificato client con CN autorizzato accettato', validNodeErr === undefined);

        const invalidNodeErr = serverConfig.checkServerIdentity('dummyHost', { subject: { CN: 'node-malicious' } });
        check('MtlsClusterBridge: certificato client non autorizzato respinto', invalidNodeErr instanceof Error);

        const clientConfig = MtlsClusterBridge.createClientConfig({
            key: dummyKey,
            cert: dummyCert,
            ca: dummyCa,
            expectedNodeId: 'node-target-5'
        });

        const clientCheckOk = clientConfig.checkServerIdentity('dummyHost', { subject: { CN: 'node-target-5' } });
        check('MtlsClusterBridge client: verifica identita del server atteso riuscita', clientCheckOk === undefined);
    } catch (e) {
        check('testMtlsClusterBridge error: ' + e.message, false);
    }
}

async function runAll() {
    try {
        await testPolicyEngine();
        await testIpcHmacGuard();
        await testMtlsClusterBridge();

        if (failures > 0) {
            console.log(`\nTEST FALLITI: ${failures}`);
            process.exit(1);
        } else {
            console.log('\nTUTTI I TEST ZERO TRUST SECURITY SUPERATI CON SUCCESSO');
            process.exit(0);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runAll();
