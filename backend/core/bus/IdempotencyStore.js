'use strict';

class IdempotencyStore {
    constructor(ttlMs = 300000) {
        try {
            this.ttlMs = ttlMs;
            this.processedEvents = new Map();
            this._startCleanupTimer();
        } catch (e) {
            this.ttlMs = 300000;
            this.processedEvents = new Map();
        }
    }

    _startCleanupTimer() {
        try {
            const timer = setInterval(() => {
                try {
                    this.cleanupExpired();
                } catch (e) {
                    return;
                }
            }, 60000);
            if (timer.unref) {
                timer.unref();
            }
        } catch (e) {
            return;
        }
    }

    cleanupExpired() {
        try {
            const now = Date.now();
            for (const [eventId, record] of this.processedEvents.entries()) {
                if (now - record.timestamp > this.ttlMs) {
                    this.processedEvents.delete(eventId);
                }
            }
        } catch (e) {
            return;
        }
    }

    has(eventId) {
        try {
            if (!eventId) return false;
            const record = this.processedEvents.get(eventId);
            if (!record) return false;
            if (Date.now() - record.timestamp > this.ttlMs) {
                this.processedEvents.delete(eventId);
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    mark(eventId, result = null) {
        try {
            if (!eventId) return false;
            this.processedEvents.set(eventId, {
                timestamp: Date.now(),
                result: result !== undefined ? result : null
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    getResult(eventId) {
        try {
            if (!this.has(eventId)) return null;
            const record = this.processedEvents.get(eventId);
            return record ? record.result : null;
        } catch (e) {
            return null;
        }
    }

    clear() {
        try {
            this.processedEvents.clear();
        } catch (e) {
            return;
        }
    }
}

module.exports = IdempotencyStore;
