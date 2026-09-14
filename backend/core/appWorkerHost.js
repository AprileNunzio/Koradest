'use strict';

const { fork } = require('child_process');
const path = require('path');
const bus = require('./event_bus');

const MAX_RAM_MB = 256;
const DEFAULT_TIMEOUT_MS = 10000;

const workers = new Map();
const pendingRequests = new Map();

function startWorker(appId, manifest, backendPath) {
    try {
        if (workers.has(appId)) {
            stopWorker(appId);
        }

        const child = fork(backendPath, [], {
            execArgv: [`--max-old-space-size=${MAX_RAM_MB}`],
            env: {
                ...process.env,
                KORADEST_APP_ID: appId,
                KORADEST_MAX_RAM_MB: String(MAX_RAM_MB)
            },
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
        });

        const workerEntry = {
            appId,
            manifest,
            backendPath,
            process: child,
            pid: child.pid,
            restarts: 0,
            startedAt: Date.now(),
            lastMemoryUsageMb: 0
        };

        child.on('message', (msg) => {
            try {
                if (!msg || !msg.correlationId) return;
                const pending = pendingRequests.get(msg.correlationId);
                if (pending) {
                    clearTimeout(pending.timer);
                    pendingRequests.delete(msg.correlationId);
                    if (msg.error) {
                        pending.reject(new Error(msg.error));
                    } else {
                        pending.resolve(msg.data);
                    }
                }
            } catch (_) {}
        });

        child.on('exit', (code, signal) => {
            try {
                const entry = workers.get(appId);
                if (entry && entry.process === child) {
                    bus.publish('worker:exit', { appId, code, signal });
                    if (code !== 0 && entry.restarts < 5) {
                        entry.restarts++;
                        setTimeout(() => {
                            try { startWorker(appId, manifest, backendPath); } catch (_) {}
                        }, 1000);
                    } else {
                        workers.delete(appId);
                    }
                }
            } catch (_) {}
        });

        workers.set(appId, workerEntry);
        return true;
    } catch (_) {
        return false;
    }
}

function stopWorker(appId) {
    try {
        if (!workers.has(appId)) return false;
        const entry = workers.get(appId);
        if (entry && entry.process) {
            try { entry.process.kill('SIGTERM'); } catch (_) {}
        }
        workers.delete(appId);
        return true;
    } catch (_) {
        return false;
    }
}

async function sendWorkerMessage(appId, action, payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
    try {
        const entry = workers.get(appId);
        if (!entry || !entry.process || entry.process.killed) {
            return { success: false, error: 'Worker non attivo per ' + appId };
        }

        const correlationId = appId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2);

        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingRequests.delete(correlationId);
                reject(new Error('Timeout operazione worker (' + timeoutMs + 'ms) per ' + appId + ':' + action));
            }, timeoutMs);

            pendingRequests.set(correlationId, { resolve, reject, timer });

            try {
                entry.process.send({
                    correlationId,
                    action,
                    payload
                });
            } catch (sendErr) {
                clearTimeout(timer);
                pendingRequests.delete(correlationId);
                reject(sendErr);
            }
        });
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getWorkerStats(appId) {
    try {
        const entry = workers.get(appId);
        if (!entry) return null;
        return {
            appId,
            pid: entry.pid,
            restarts: entry.restarts,
            uptimeSeconds: Math.floor((Date.now() - entry.startedAt) / 1000),
            maxRamLimitMb: MAX_RAM_MB
        };
    } catch (_) {
        return null;
    }
}

function listAllWorkerStats() {
    try {
        const list = [];
        for (const [appId] of workers) {
            const s = getWorkerStats(appId);
            if (s) list.push(s);
        }
        return list;
    } catch (_) {
        return [];
    }
}

module.exports = {
    startWorker,
    stopWorker,
    sendWorkerMessage,
    getWorkerStats,
    listAllWorkerStats,
    MAX_RAM_MB
};
