'use strict';

const ICommunicationProvider = require('../ICommunicationProvider');

class WebPushProvider extends ICommunicationProvider {
    constructor(config = {}) {
        super();
        try {
            this.config = config;
        } catch (e) {
            this.config = {};
        }
    }

    getChannel() {
        return 'push';
    }

    getProviderId() {
        return 'webpush';
    }

    updateConfig(newConfig) {
        try {
            this.config = Object.assign({}, this.config, newConfig || {});
            return true;
        } catch (e) {
            return false;
        }
    }

    async send(request) {
        try {
            if (!request || !request.recipient || !request.title) {
                return { success: false, error: 'Destinatario e titolo sono obbligatori' };
            }

            const payload = {
                title: request.title,
                body: request.body || '',
                icon: request.icon || 'default.png',
                data: request.data || {},
                timestamp: Date.now()
            };

            return {
                success: true,
                messageId: `push_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                deliveredPayload: payload
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async healthCheck() {
        try {
            return { healthy: true, details: 'Provider WebPush operativo' };
        } catch (e) {
            return { healthy: false, details: e.message };
        }
    }
}

module.exports = WebPushProvider;
