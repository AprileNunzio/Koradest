'use strict';

const dbManager = require('../db/db_manager');
const appWorkerHost = require('./appWorkerHost');
const bus = require('./event_bus');

let doctorTimer = null;
let currentClockOffsetMs = 0;

function calculateMedian(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) return sorted[middle];
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function updateClockOffset(peerSamples = []) {
    try {
        if (!peerSamples || peerSamples.length === 0) return currentClockOffsetMs;
        const now = Date.now();
        const diffs = peerSamples.map(sample => {
            const peerTime = typeof sample === 'number' ? sample : (sample.timestamp || now);
            const latency = (sample.latency || 0) / 2;
            return (peerTime + latency) - now;
        });

        currentClockOffsetMs = calculateMedian(diffs);
        return currentClockOffsetMs;
    } catch (_) {
        return currentClockOffsetMs;
    }
}

function getAdjustedTimestamp() {
    try {
        return Date.now() + currentClockOffsetMs;
    } catch (_) {
        return Date.now();
    }
}

async function runPreventiveMaintenance() {
    try {
        const dbs = dbManager.getAllLoadedDBNames ? dbManager.getAllLoadedDBNames() : ['auth', 'store', 'config', 'ledger'];
        const results = [];

        for (const name of dbs) {
            try {
                const db = dbManager.getDB(name);
                if (db) {
                    db.execute('PRAGMA optimize;');
                    try { db.execute('PRAGMA wal_checkpoint(TRUNCATE);'); } catch (_) {}
                    results.push({ db: name, status: 'optimized' });
                }
            } catch (dbErr) {
                results.push({ db: name, status: 'error', error: dbErr.message });
            }
        }

        bus.publish('doctor:maintenance-completed', { timestamp: Date.now(), results });
        return { success: true, results };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function startProactiveDoctor(intervalMs = 600000) {
    try {
        if (doctorTimer) clearInterval(doctorTimer);
        doctorTimer = setInterval(() => {
            runPreventiveMaintenance().catch(() => {});
        }, intervalMs);
    } catch (_) {}
}

function stopProactiveDoctor() {
    try {
        if (doctorTimer) {
            clearInterval(doctorTimer);
            doctorTimer = null;
        }
    } catch (_) {}
}

function getDoctorReport() {
    try {
        const mem = process.memoryUsage();
        const workers = appWorkerHost.listAllWorkerStats();

        return {
            clockOffsetMs: currentClockOffsetMs,
            memory: {
                rssMb: Math.round(mem.rss / (1024 * 1024)),
                heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
                heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024))
            },
            workers,
            maxRamPerWorkerMb: appWorkerHost.MAX_RAM_MB
        };
    } catch (e) {
        return { error: e.message };
    }
}

module.exports = {
    updateClockOffset,
    getAdjustedTimestamp,
    runPreventiveMaintenance,
    startProactiveDoctor,
    stopProactiveDoctor,
    getDoctorReport
};
