'use strict';

const crypto = require('crypto');

class IpcHmacGuard {
    static signMessage(payload, secretKey, appId) {
        try {
            if (!payload || !secretKey || !appId) {
                return null;
            }
            const timestamp = Date.now();
            const nonce = crypto.randomBytes(12).toString('hex');
            const dataToSign = JSON.stringify({ payload, appId, timestamp, nonce });
            const hmac = crypto.createHmac('sha256', secretKey).update(dataToSign).digest('hex');

            return {
                appId,
                timestamp,
                nonce,
                payload,
                hmac
            };
        } catch (e) {
            return null;
        }
    }

    static verifyMessage(signedMessage, secretKey, maxAgeMs = 15000) {
        try {
            if (!signedMessage || !signedMessage.hmac || !secretKey) {
                return { valid: false, reason: 'Messaggio non firmato o chiave assente' };
            }

            const now = Date.now();
            if (now - signedMessage.timestamp > maxAgeMs) {
                return { valid: false, reason: 'Messaggio IPC scaduto (possibile replay attack)' };
            }

            const dataToSign = JSON.stringify({
                payload: signedMessage.payload,
                appId: signedMessage.appId,
                timestamp: signedMessage.timestamp,
                nonce: signedMessage.nonce
            });

            const expectedHmac = crypto.createHmac('sha256', secretKey).update(dataToSign).digest('hex');
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signedMessage.hmac, 'hex'),
                Buffer.from(expectedHmac, 'hex')
            );

            if (!isValid) {
                return { valid: false, reason: 'Firma HMAC non valida o payload manomesso' };
            }

            return { valid: true, payload: signedMessage.payload };
        } catch (e) {
            return { valid: false, reason: e.message };
        }
    }
}

module.exports = IpcHmacGuard;
