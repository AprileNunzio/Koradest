'use strict';

const crypto = require('crypto');
const EventEnvelope = require('./EventEnvelope');
const TopicRouter = require('./TopicRouter');
const IdempotencyStore = require('./IdempotencyStore');

class UniversalEventBus {
    constructor(options = {}) {
        try {
            this.router = new TopicRouter();
            this.idempotency = new IdempotencyStore(options.idempotencyTtlMs || 300000);
            this.defaultSource = options.defaultSource || 'koradest://system';
            this.defaultSigningKey = options.signingKey || null;
            this.requestHandlers = new Map();
        } catch (e) {
            this.router = new TopicRouter();
            this.idempotency = new IdempotencyStore();
            this.defaultSource = 'koradest://system';
            this.defaultSigningKey = null;
            this.requestHandlers = new Map();
        }
    }

    subscribe(topicPattern, handler, metadata = {}) {
        try {
            if (!topicPattern || typeof handler !== 'function') {
                return null;
            }
            const subId = this.router.subscribe(topicPattern, handler, metadata);
            return () => {
                try {
                    return this.router.unsubscribe(topicPattern, subId);
                } catch (e) {
                    return false;
                }
            };
        } catch (e) {
            return null;
        }
    }

    async publish(topic, payload, options = {}) {
        try {
            if (!topic || typeof topic !== 'string') {
                return { success: false, error: 'Topic non specificato o non valido' };
            }

            const envelope = (payload && payload.specversion === '1.0')
                ? payload
                : EventEnvelope.create({
                    id: options.id,
                    source: options.source || this.defaultSource,
                    type: topic,
                    data: payload,
                    traceparent: options.traceparent,
                    signingKey: options.signingKey || this.defaultSigningKey
                });

            if (this.idempotency.has(envelope.id)) {
                return {
                    success: true,
                    duplicate: true,
                    eventId: envelope.id,
                    result: this.idempotency.getResult(envelope.id)
                };
            }

            const handlers = this.router.findMatchingHandlers(topic);
            const executionPromises = handlers.map(async (sub) => {
                try {
                    return await sub.handler(envelope);
                } catch (handlerErr) {
                    return { error: handlerErr.message };
                }
            });

            const results = await Promise.all(executionPromises);
            this.idempotency.mark(envelope.id, results);

            return {
                success: true,
                duplicate: false,
                eventId: envelope.id,
                dispatchedCount: handlers.length,
                results
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    handleRequest(actionTopic, handler) {
        try {
            if (!actionTopic || typeof handler !== 'function') {
                return false;
            }
            return this.subscribe(actionTopic, async (envelope) => {
                try {
                    const result = await handler(envelope.data, envelope);
                    if (envelope.data && envelope.data.replyTo) {
                        await this.publish(envelope.data.replyTo, {
                            correlationId: envelope.data.correlationId,
                            success: true,
                            data: result
                        });
                    }
                } catch (err) {
                    if (envelope.data && envelope.data.replyTo) {
                        await this.publish(envelope.data.replyTo, {
                            correlationId: envelope.data.correlationId,
                            success: false,
                            error: err.message
                        });
                    }
                }
            });
        } catch (e) {
            return false;
        }
    }

    async request(topic, payload, options = {}) {
        try {
            const correlationId = options.correlationId || crypto.randomUUID();
            const replyTopic = `_reply.${correlationId}`;
            const timeoutMs = options.timeoutMs || 5000;

            return new Promise((resolve, reject) => {
                let timer = null;
                let unsubscribe = null;

                unsubscribe = this.subscribe(replyTopic, (replyEnvelope) => {
                    try {
                        if (timer) clearTimeout(timer);
                        if (unsubscribe) unsubscribe();

                        const replyData = replyEnvelope.data || {};
                        if (replyData.success === false) {
                            reject(new Error(replyData.error || 'Errore nella risposta alla richiesta'));
                        } else {
                            resolve(replyData.data !== undefined ? replyData.data : replyData);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });

                timer = setTimeout(() => {
                    try {
                        if (unsubscribe) unsubscribe();
                        reject(new Error(`Timeout richiesta bus superato (${timeoutMs}ms) per topic: ${topic}`));
                    } catch (e) {
                        reject(e);
                    }
                }, timeoutMs);

                const requestPayload = Object.assign({}, payload || {}, {
                    replyTo: replyTopic,
                    correlationId: correlationId
                });

                this.publish(topic, requestPayload, options).catch((err) => {
                    if (timer) clearTimeout(timer);
                    if (unsubscribe) unsubscribe();
                    reject(err);
                });
            });
        } catch (e) {
            return Promise.reject(e);
        }
    }
}

module.exports = new UniversalEventBus();
