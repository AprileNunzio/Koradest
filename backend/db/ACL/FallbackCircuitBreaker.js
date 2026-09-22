'use strict';

class FallbackCircuitBreaker {
    constructor(options = {}) {
        try {
            this.failureThreshold = options.failureThreshold || 3;
            this.recoveryTimeMs = options.recoveryTimeMs || 10000;
            this.autoSnapshot = options.autoSnapshot !== false;
            this.state = 'CLOSED';
            this.failureCount = 0;
            this.lastFailureTime = null;
            this.fallbackSnapshots = new Map();
        } catch (e) {
            this.failureThreshold = 3;
            this.recoveryTimeMs = 10000;
            this.autoSnapshot = true;
            this.state = 'CLOSED';
            this.failureCount = 0;
            this.lastFailureTime = null;
            this.fallbackSnapshots = new Map();
        }
    }

    setSnapshot(key, data) {
        try {
            this.fallbackSnapshots.set(key, {
                data: JSON.parse(JSON.stringify(data)),
                timestamp: Date.now()
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    getSnapshot(key) {
        try {
            const entry = this.fallbackSnapshots.get(key);
            return entry ? entry.data : null;
        } catch (e) {
            return null;
        }
    }

    getState() {
        try {
            if (this.state === 'OPEN') {
                const now = Date.now();
                if (now - this.lastFailureTime >= this.recoveryTimeMs) {
                    this.state = 'HALF_OPEN';
                }
            }
            return this.state;
        } catch (e) {
            return 'CLOSED';
        }
    }

    recordSuccess() {
        try {
            this.failureCount = 0;
            this.state = 'CLOSED';
            return true;
        } catch (e) {
            return false;
        }
    }

    recordFailure() {
        try {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            if (this.failureCount >= this.failureThreshold) {
                this.state = 'OPEN';
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async execute(key, operationFn, fallbackFn = null, options = {}) {
        try {
            const allowFallback = options.allowFallback !== false;
            const currentState = this.getState();

            if (currentState === 'OPEN') {
                if (allowFallback) {
                    if (typeof fallbackFn === 'function') {
                        const fallbackData = await fallbackFn();
                        return { success: true, fromFallback: true, circuitOpen: true, data: fallbackData };
                    }
                    const cached = this.getSnapshot(key);
                    if (cached !== null) {
                        return { success: true, fromFallback: true, circuitOpen: true, data: cached };
                    }
                }
                return { success: false, circuitOpen: true, error: 'Circuito aperto e nessun fallback disponibile' };
            }

            try {
                const result = await operationFn();
                this.recordSuccess();
                if (this.autoSnapshot && result !== undefined && result !== null) {
                    this.setSnapshot(key, result);
                }
                return { success: true, fromFallback: false, circuitOpen: false, data: result };
            } catch (innerError) {
                this.recordFailure();
                if (allowFallback) {
                    if (typeof fallbackFn === 'function') {
                        const fallbackData = await fallbackFn();
                        return { success: true, fromFallback: true, circuitOpen: this.state === 'OPEN', data: fallbackData };
                    }
                    const cached = this.getSnapshot(key);
                    if (cached !== null) {
                        return { success: true, fromFallback: true, circuitOpen: this.state === 'OPEN', data: cached };
                    }
                }
                return { success: false, circuitOpen: this.state === 'OPEN', error: innerError.message };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = FallbackCircuitBreaker;
