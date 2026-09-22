'use strict';

class SelfHealingWatchdogAgent {
    constructor() {
        try {
            this.services = new Map();
        } catch (e) {
            this.services = new Map();
        }
    }

    registerService(serviceId, options = {}) {
        try {
            if (!serviceId) return false;
            this.services.set(serviceId, {
                serviceId,
                restartFn: typeof options.restartFn === 'function' ? options.restartFn : async () => true,
                maxFailures: options.maxFailures || 3,
                maxHeartbeatIntervalMs: options.maxHeartbeatIntervalMs || 60000,
                failures: 0,
                restarts: 0,
                status: 'HEALTHY',
                lastHeartbeat: Date.now(),
                inQuarantine: false
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    recordHeartbeat(serviceId) {
        try {
            const svc = this.services.get(serviceId);
            if (svc) {
                svc.lastHeartbeat = Date.now();
                if (svc.status === 'FROZEN') {
                    svc.status = 'HEALTHY';
                }
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    recordFailure(serviceId, error) {
        try {
            const svc = this.services.get(serviceId);
            if (svc) {
                svc.failures++;
                svc.lastError = error ? error.message : 'Errore generico';
                if (svc.failures >= svc.maxFailures) {
                    svc.status = 'CRITICAL';
                }
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async tick() {
        try {
            let recoveredCount = 0;
            const now = Date.now();

            for (const [id, svc] of this.services.entries()) {
                if (svc.inQuarantine) continue;

                const isStale = (now - svc.lastHeartbeat) > svc.maxHeartbeatIntervalMs;
                if (isStale && svc.status !== 'CRITICAL') {
                    svc.status = 'FROZEN';
                }

                if (svc.status === 'CRITICAL' || svc.status === 'FROZEN') {
                    if (svc.restarts >= 5) {
                        svc.inQuarantine = true;
                        svc.status = 'QUARANTINED';
                        continue;
                    }

                    try {
                        const restarted = await svc.restartFn();
                        if (restarted) {
                            svc.restarts++;
                            svc.failures = 0;
                            svc.status = 'HEALTHY';
                            svc.lastHeartbeat = Date.now();
                            recoveredCount++;
                        }
                    } catch (restartErr) {
                        svc.failures++;
                    }
                }
            }

            return { reconciled: recoveredCount };
        } catch (e) {
            return { reconciled: 0, error: e.message };
        }
    }

    getServiceStatus(serviceId) {
        try {
            return this.services.get(serviceId) || null;
        } catch (e) {
            return null;
        }
    }
}

module.exports = SelfHealingWatchdogAgent;
