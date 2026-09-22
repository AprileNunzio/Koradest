'use strict';

const crypto = require('crypto');
const UniversalEventBus = require('../core/bus/UniversalEventBus');

function _maskPii(obj) {
    try {
        if (!obj) return obj;
        if (typeof obj === 'string') {
            return obj.replace(/(password|secret|token|credit_card|iban|codice_fiscale)=[^&,\s]+/gi, '$1=[GDPR_MASKED]');
        }
        if (typeof obj !== 'object') return obj;

        const masked = Array.isArray(obj) ? [] : {};
        for (const [key, val] of Object.entries(obj)) {
            try {
                if (/password|pass|secret|token|credit_card|card_number|cvv|iban|codice_fiscale|tax_code/i.test(key)) {
                    masked[key] = '[GDPR_MASKED]';
                } else if (val && typeof val === 'object') {
                    masked[key] = _maskPii(val);
                } else {
                    masked[key] = val;
                }
            } catch (eKey) {
                masked[key] = val;
            }
        }
        return masked;
    } catch (e) {
        return obj;
    }
}

class MatterAuditEngine {
    constructor() {
        try {
            this.GENESIS_HASH = '0'.repeat(64);
            this.lastHash = this.GENESIS_HASH;
            this.sequence = 0;
            this.records = [];
            this.maxRecordsInMemory = 5000;
            this._setupBusSubscription();
        } catch (e) {
            this.GENESIS_HASH = '0'.repeat(64);
            this.lastHash = this.GENESIS_HASH;
            this.sequence = 0;
            this.records = [];
            this.maxRecordsInMemory = 5000;
        }
    }

    _setupBusSubscription() {
        try {
            UniversalEventBus.subscribe('koradest.audit.>', async (envelope) => {
                try {
                    if (envelope && envelope.payload && !envelope.payload._audited) {
                        this.record({
                            category: envelope.topic.replace('koradest.audit.', ''),
                            actor: envelope.payload.actor || { id: 'system', role: 'system' },
                            action: envelope.payload.action || envelope.topic,
                            target: envelope.payload.target || '',
                            data: envelope.payload.data || envelope.payload,
                            status: envelope.payload.status || 'SUCCESS',
                            fromBus: true
                        });
                    }
                } catch (eSub) {
                    return false;
                }
            });
        } catch (e) {
            return false;
        }
    }

    record({ category = 'system', actor = { id: 'system', role: 'system' }, action = 'UNKNOWN', target = '', data = {}, status = 'SUCCESS', fromBus = false } = {}) {
        try {
            this.sequence += 1;
            const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
            const timestamp = Date.now();
            const prevHash = this.lastHash;
            const sanitizedData = _maskPii(data);

            const payloadToHash = JSON.stringify({
                seq: this.sequence,
                id,
                timestamp,
                prevHash,
                category,
                actor: typeof actor === 'object' ? actor : { id: String(actor) },
                action,
                target,
                data: sanitizedData,
                status
            });

            const hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
            this.lastHash = hash;

            const entry = {
                seq: this.sequence,
                id,
                timestamp,
                prevHash,
                hash,
                category,
                actor: typeof actor === 'object' ? actor : { id: String(actor) },
                action,
                target,
                data: sanitizedData,
                status
            };

            this.records.push(entry);
            if (this.records.length > this.maxRecordsInMemory) {
                this.records.shift();
            }

            if (!fromBus) {
                try {
                    UniversalEventBus.publish(`koradest.audit.${category}.${action}`, Object.assign({}, entry, { _audited: true }), {
                        source: 'MatterAuditEngine'
                    });
                } catch (ePub) {
                    return entry;
                }
            }

            return entry;
        } catch (e) {
            return { error: e.message, status: 'FAILED' };
        }
    }

    verifyIntegrity(recordsList = null) {
        try {
            const list = recordsList || this.records;
            if (!Array.isArray(list) || list.length === 0) {
                return { isValid: true, verifiedCount: 0 };
            }

            let expectedPrevHash = list[0].prevHash;

            for (let i = 0; i < list.length; i++) {
                const entry = list[i];
                if (entry.prevHash !== expectedPrevHash) {
                    return {
                        isValid: false,
                        error: `Hash chain broken at seq ${entry.seq}. Expected prevHash: ${expectedPrevHash}, found: ${entry.prevHash}`,
                        failedAtSeq: entry.seq
                    };
                }

                const payloadToHash = JSON.stringify({
                    seq: entry.seq,
                    id: entry.id,
                    timestamp: entry.timestamp,
                    prevHash: entry.prevHash,
                    category: entry.category,
                    actor: entry.actor,
                    action: entry.action,
                    target: entry.target,
                    data: entry.data,
                    status: entry.status
                });

                const computedHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
                if (computedHash !== entry.hash) {
                    return {
                        isValid: false,
                        error: `Tampering detected at seq ${entry.seq}. Hash mismatch.`,
                        failedAtSeq: entry.seq
                    };
                }

                expectedPrevHash = entry.hash;
            }

            return { isValid: true, verifiedCount: list.length, lastVerifiedHash: expectedPrevHash };
        } catch (e) {
            return { isValid: false, error: e.message };
        }
    }

    calculateMerkleRoot(recordsList = null) {
        try {
            const list = recordsList || this.records;
            if (!list || list.length === 0) return this.GENESIS_HASH;

            let currentLevel = list.map(r => r.hash || crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex'));

            while (currentLevel.length > 1) {
                const nextLevel = [];
                for (let i = 0; i < currentLevel.length; i += 2) {
                    const left = currentLevel[i];
                    const right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left;
                    const combined = crypto.createHash('sha256').update(left + right).digest('hex');
                    nextLevel.push(combined);
                }
                currentLevel = nextLevel;
            }

            return currentLevel[0];
        } catch (e) {
            return this.GENESIS_HASH;
        }
    }

    exportGdprRegister({ dateFrom = 0, dateTo = Infinity, actorId = null } = {}) {
        try {
            const filtered = this.records.filter(r => {
                const matchTime = r.timestamp >= dateFrom && r.timestamp <= dateTo;
                const matchActor = actorId ? (r.actor && r.actor.id === actorId) : true;
                return matchTime && matchActor;
            });

            const integrity = this.verifyIntegrity(filtered);
            const merkleRoot = this.calculateMerkleRoot(filtered);

            return {
                gdprArticle: 'Article 30 - Records of processing activities',
                exportedAt: new Date().toISOString(),
                totalActivities: filtered.length,
                integrityVerified: integrity.isValid,
                merkleRoot,
                activities: filtered
            };
        } catch (e) {
            return { error: e.message };
        }
    }

    query(filters = {}) {
        try {
            return this.records.filter(r => {
                if (filters.category && r.category !== filters.category) return false;
                if (filters.action && r.action !== filters.action) return false;
                if (filters.actorId && (!r.actor || r.actor.id !== filters.actorId)) return false;
                if (filters.status && r.status !== filters.status) return false;
                return true;
            });
        } catch (e) {
            return [];
        }
    }

    clear() {
        try {
            this.records = [];
            this.lastHash = this.GENESIS_HASH;
            this.sequence = 0;
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new MatterAuditEngine();
