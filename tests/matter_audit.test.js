'use strict';

const MatterAuditEngine = require('../backend/observability/MatterAuditEngine');
const UniversalEventBus = require('../backend/core/bus/UniversalEventBus');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

async function runTests() {
    try {
        MatterAuditEngine.clear();

        const entry1 = MatterAuditEngine.record({
            category: 'auth',
            actor: { id: 'admin_1', role: 'admin' },
            action: 'LOGIN',
            target: 'system_console',
            data: { ip: '192.168.1.100', password: 'plain_secret_to_mask' },
            status: 'SUCCESS'
        });

        check('MatterAuditEngine record hashes and sequences', entry1.seq === 1 && entry1.prevHash === MatterAuditEngine.GENESIS_HASH && entry1.hash.length === 64);
        check('MatterAuditEngine masks sensitive PII data', entry1.data.password === '[GDPR_MASKED]');

        const entry2 = MatterAuditEngine.record({
            category: 'medical',
            actor: { id: 'doctor_rossi', role: 'dentist' },
            action: 'ANAMNESIS_UPDATE',
            target: 'patient_88',
            data: { notes: 'Routine checkup', codice_fiscale: 'RSSMRA85M01H501Z' },
            status: 'SUCCESS'
        });

        check('MatterAuditEngine chains hashes consecutively', entry2.prevHash === entry1.hash && entry2.seq === 2);
        check('MatterAuditEngine masks fiscal code PII', entry2.data.codice_fiscale === '[GDPR_MASKED]');

        const integrity = MatterAuditEngine.verifyIntegrity();
        check('MatterAuditEngine verifyIntegrity on valid chain', integrity.isValid && integrity.verifiedCount === 2);

        const tamperedRecords = JSON.parse(JSON.stringify(MatterAuditEngine.records));
        tamperedRecords[0].data.ip = 'attacker_ip';
        const tamperedIntegrity = MatterAuditEngine.verifyIntegrity(tamperedRecords);
        check('MatterAuditEngine detects tampering in audit entry', !tamperedIntegrity.isValid && tamperedIntegrity.failedAtSeq === 1);

        const merkleRoot = MatterAuditEngine.calculateMerkleRoot();
        check('MatterAuditEngine calculateMerkleRoot returns 32-byte hex', typeof merkleRoot === 'string' && merkleRoot.length === 64);

        const gdprReport = MatterAuditEngine.exportGdprRegister();
        check('MatterAuditEngine exportGdprRegister complies with Art 30', gdprReport.totalActivities === 2 && gdprReport.integrityVerified);

        process.exit(failures > 0 ? 1 : 0);
    } catch (e) {
        console.error('Audit test failed:', e);
        process.exit(1);
    }
}

runTests();
