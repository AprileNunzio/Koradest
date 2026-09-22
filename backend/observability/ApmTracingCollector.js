'use strict';

const crypto = require('crypto');

class ApmTracingCollector {
    constructor(maxSpans = 1000) {
        try {
            this.maxSpans = maxSpans;
            this.activeSpans = new Map();
            this.completedSpans = [];
            this.metricsByAction = new Map();
        } catch (e) {
            this.maxSpans = 1000;
            this.activeSpans = new Map();
            this.completedSpans = [];
            this.metricsByAction = new Map();
        }
    }

    generateTraceId() {
        try {
            return crypto.randomBytes(16).toString('hex');
        } catch (e) {
            return Date.now().toString(16).padStart(32, '0');
        }
    }

    generateSpanId() {
        try {
            return crypto.randomBytes(8).toString('hex');
        } catch (e) {
            return Date.now().toString(16).padStart(16, '0');
        }
    }

    startSpan(name, { traceId = null, parentSpanId = null, tags = {} } = {}) {
        try {
            const spanId = this.generateSpanId();
            const resolvedTraceId = traceId || this.generateTraceId();
            const startTime = process.hrtime.bigint();
            const timestamp = Date.now();

            const traceparent = `00-${resolvedTraceId}-${spanId}-01`;

            const span = {
                spanId,
                traceId: resolvedTraceId,
                parentSpanId,
                traceparent,
                name: name || 'anonymous-span',
                startTime,
                timestamp,
                tags: Object.assign({}, tags),
                status: 'IN_PROGRESS',
                durationMs: null
            };

            this.activeSpans.set(spanId, span);
            return span;
        } catch (e) {
            return {
                spanId: this.generateSpanId(),
                traceId: this.generateTraceId(),
                traceparent: '',
                name,
                status: 'ERROR',
                error: e.message
            };
        }
    }

    endSpan(spanId, status = 'OK', tags = {}) {
        try {
            const span = this.activeSpans.get(spanId);
            if (!span) return null;

            const endTime = process.hrtime.bigint();
            const durationNs = Number(endTime - span.startTime);
            span.durationMs = Number((durationNs / 1e6).toFixed(3));
            span.status = status;
            span.tags = Object.assign(span.tags, tags);

            this.activeSpans.delete(spanId);

            if (this.completedSpans.length >= this.maxSpans) {
                this.completedSpans.shift();
            }
            this.completedSpans.push(span);

            this._recordMetric(span.name, span.durationMs, status === 'OK');

            return span;
        } catch (e) {
            return null;
        }
    }

    _recordMetric(name, durationMs, success) {
        try {
            if (!this.metricsByAction.has(name)) {
                this.metricsByAction.set(name, {
                    count: 0,
                    errors: 0,
                    durations: []
                });
            }
            const record = this.metricsByAction.get(name);
            record.count += 1;
            if (!success) record.errors += 1;
            record.durations.push(durationMs);
            if (record.durations.length > 500) {
                record.durations.shift();
            }
        } catch (e) {
            return false;
        }
    }

    getMetricsSummary() {
        try {
            const summary = {};
            for (const [name, data] of this.metricsByAction.entries()) {
                const sorted = [...data.durations].sort((a, b) => a - b);
                const count = sorted.length;
                const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
                const p95 = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
                const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;
                const avg = count > 0 ? Number((sorted.reduce((acc, v) => acc + v, 0) / count).toFixed(3)) : 0;

                summary[name] = {
                    totalCalls: data.count,
                    errorRate: data.count > 0 ? Number((data.errors / data.count).toFixed(4)) : 0,
                    avgMs: avg,
                    p50Ms: p50,
                    p95Ms: p95,
                    p99Ms: p99
                };
            }
            return summary;
        } catch (e) {
            return {};
        }
    }

    getTraceSpans(traceId) {
        try {
            return this.completedSpans.filter(s => s.traceId === traceId);
        } catch (e) {
            return [];
        }
    }

    getRecentSpans(limit = 50) {
        try {
            return this.completedSpans.slice(-limit);
        } catch (e) {
            return [];
        }
    }

    clear() {
        try {
            this.activeSpans.clear();
            this.completedSpans = [];
            this.metricsByAction.clear();
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new ApmTracingCollector();
