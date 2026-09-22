'use strict';

const crypto = require('crypto');

class EventEnvelope {
    static create({ id, source, type, data, traceparent, signingKey }) {
        try {
            if (!source || typeof source !== 'string') {
                throw new Error('Parametro source obbligatorio');
            }
            if (!type || typeof type !== 'string') {
                throw new Error('Parametro type obbligatorio');
            }

            const envelope = {
                specversion: '1.0',
                id: id || crypto.randomUUID(),
                source: source,
                type: type,
                datacontenttype: 'application/json',
                time: new Date().toISOString(),
                data: data !== undefined ? data : null,
                traceparent: traceparent || `00-${crypto.randomBytes(16).toString('hex')}-${crypto.randomBytes(8).toString('hex')}-01`,
                signature: null
            };

            if (signingKey) {
                envelope.signature = EventEnvelope.sign(envelope, signingKey);
            }

            return envelope;
        } catch (e) {
            throw e;
        }
    }

    static serializeCanonical(envelope) {
        try {
            const canonicalObject = {
                specversion: envelope.specversion,
                id: envelope.id,
                source: envelope.source,
                type: envelope.type,
                datacontenttype: envelope.datacontenttype,
                time: envelope.time,
                data: envelope.data,
                traceparent: envelope.traceparent
            };
            return JSON.stringify(canonicalObject);
        } catch (e) {
            return '';
        }
    }

    static sign(envelope, secretKey) {
        try {
            const content = EventEnvelope.serializeCanonical(envelope);
            return crypto.createHmac('sha256', secretKey).update(content).digest('hex');
        } catch (e) {
            return null;
        }
    }

    static verify(envelope, secretKey) {
        try {
            if (!envelope || !envelope.signature || !secretKey) {
                return false;
            }
            const expected = EventEnvelope.sign(envelope, secretKey);
            return crypto.timingSafeEqual(Buffer.from(envelope.signature, 'hex'), Buffer.from(expected, 'hex'));
        } catch (e) {
            return false;
        }
    }
}

module.exports = EventEnvelope;
