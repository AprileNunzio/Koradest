'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DomainConflictMerger = require('../backend/db/mergers/DomainConflictMerger');
const ZeroKnowledgeCloudBridge = require('../backend/backup/ZeroKnowledgeCloudBridge');
const ApmTracingCollector = require('../backend/observability/ApmTracingCollector');
const WasiPluginHost = require('../backend/core/WasiPluginHost');
const Rfc3161TimestampClient = require('../backend/security/Rfc3161TimestampClient');

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
        const base = { id: 'patient-1', name: 'Mario', phone: '111' };
        const local = { id: 'patient-1', name: 'Mario Rossi', phone: '111', updated_at: 100 };
        const remote = { id: 'patient-1', name: 'Mario', phone: '222', updated_at: 110 };

        const resMerge1 = DomainConflictMerger.merge('patients', { base, local, remote });
        check('DomainConflictMerger field-level merge', resMerge1.success && resMerge1.merged.name === 'Mario Rossi' && resMerge1.merged.phone === '222' && !resMerge1.hasConflicts);

        const base2 = { id: 'appt-1', note: 'Initial' };
        const local2 = { id: 'appt-1', note: 'Local update', updated_at: 200 };
        const remote2 = { id: 'appt-1', note: 'Remote update', updated_at: 300 };

        const resMerge2 = DomainConflictMerger.merge('appointments', { base: base2, local: local2, remote: remote2 });
        check('DomainConflictMerger conflict resolution fallback', resMerge2.success && resMerge2.hasConflicts && resMerge2.merged.note === 'Remote update');

        const zkBridge = new ZeroKnowledgeCloudBridge();
        const secretData = JSON.stringify({ secret: 'koradest-dag-vault-data-12345' });
        const passphrase = 'UltraSecurePassphrase_2026!';

        const encRes = zkBridge.encryptPayload(secretData, passphrase);
        check('ZeroKnowledgeCloudBridge encryptPayload', encRes.success && typeof encRes.envelope === 'string');

        const decRes = zkBridge.decryptPayload(encRes.envelope, passphrase);
        check('ZeroKnowledgeCloudBridge decryptPayload correct pass', decRes.success && decRes.data === secretData);

        const failRes = zkBridge.decryptPayload(encRes.envelope, 'wrong-password');
        check('ZeroKnowledgeCloudBridge decryptPayload wrong pass', !failRes.success);

        const tmpDir = path.join(__dirname, 'tmp_zk_vault');
        const zkBridgeDisk = new ZeroKnowledgeCloudBridge({ localDir: tmpDir });
        const backupRes = await zkBridgeDisk.backupEncryptedFile('worm_test', 'Sensitive Health Record', passphrase, 1);
        check('ZeroKnowledgeCloudBridge backupEncryptedFile', backupRes.success);

        const delRes = await zkBridgeDisk.storageAdapter.delete(backupRes.remotePath);
        check('ZeroKnowledgeCloudBridge WORM lock prevents deletion', !delRes.success && delRes.error.includes('WORM retention lock'));

        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }

        ApmTracingCollector.clear();
        const parentSpan = ApmTracingCollector.startSpan('ipc.dispatch.order');
        const childSpan = ApmTracingCollector.startSpan('db.query.insert', {
            traceId: parentSpan.traceId,
            parentSpanId: parentSpan.spanId
        });

        ApmTracingCollector.endSpan(childSpan.spanId, 'OK');
        ApmTracingCollector.endSpan(parentSpan.spanId, 'OK');

        const traces = ApmTracingCollector.getTraceSpans(parentSpan.traceId);
        check('ApmTracingCollector traces hierarchy', traces.length === 2 && traces[0].traceId === traces[1].traceId);

        const metrics = ApmTracingCollector.getMetricsSummary();
        check('ApmTracingCollector metrics summary', metrics['ipc.dispatch.order'] && metrics['ipc.dispatch.order'].totalCalls === 1);

        const wasmBytes = new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
            0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
            0x03, 0x02, 0x01, 0x00,
            0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
            0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b
        ]);

        const loadRes = await WasiPluginHost.loadPlugin('math-core', wasmBytes);
        check('WasiPluginHost loadPlugin', loadRes.success && loadRes.exportedFunctions.includes('add'));

        const execRes = WasiPluginHost.invoke('math-core', 'add', 15, 27);
        check('WasiPluginHost invoke math addition in WASM sandbox', execRes.success && execRes.result === 42);

        WasiPluginHost.unloadPlugin('math-core');

        const query = Rfc3161TimestampClient.createTimestampQuery('Prescription Contract');
        check('Rfc3161TimestampClient createTimestampQuery DER buffer', Buffer.isBuffer(query.requestBuffer) && query.hashHex.length === 64);

        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        const tokenRes = Rfc3161TimestampClient.createLocalDeterministicToken('DAG Block #99234 Hash', privateKey);
        check('Rfc3161TimestampClient createLocalDeterministicToken', tokenRes.success && tokenRes.signature.length > 0);

        const isValid = Rfc3161TimestampClient.verifyLocalToken(tokenRes.token, tokenRes.signature, publicKey);
        check('Rfc3161TimestampClient verifyLocalToken', isValid === true);

        process.exit(failures > 0 ? 1 : 0);
    } catch (e) {
        console.error('Test execution error:', e);
        process.exit(1);
    }
}

runTests();
