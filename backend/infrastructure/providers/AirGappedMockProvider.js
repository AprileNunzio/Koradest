'use strict';

const ICommunicationProvider = require('../ICommunicationProvider');

class AirGappedMockProvider extends ICommunicationProvider {
    constructor(channel = 'email') {
        super();
        try {
            this.channel = channel;
            this.sentMessages = [];
        } catch (e) {
            this.channel = 'email';
            this.sentMessages = [];
        }
    }

    getChannel() {
        return this.channel;
    }

    getProviderId() {
        return `airgap_mock_${this.channel}`;
    }

    async send(request) {
        try {
            const record = {
                id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                channel: this.channel,
                request: JSON.parse(JSON.stringify(request || {})),
                timestamp: Date.now()
            };
            this.sentMessages.push(record);
            return {
                success: true,
                messageId: record.id,
                airGapped: true
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async healthCheck() {
        try {
            return { healthy: true, details: 'AirGapped Mock sempre disponibile in locale' };
        } catch (e) {
            return { healthy: false, details: e.message };
        }
    }

    getHistory() {
        try {
            return [...this.sentMessages];
        } catch (e) {
            return [];
        }
    }

    clear() {
        try {
            this.sentMessages = [];
        } catch (e) {
            return;
        }
    }
}

module.exports = AirGappedMockProvider;
