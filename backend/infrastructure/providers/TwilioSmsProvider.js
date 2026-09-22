'use strict';

const ICommunicationProvider = require('../ICommunicationProvider');

class TwilioSmsProvider extends ICommunicationProvider {
    constructor(config = {}) {
        super();
        try {
            this.config = config;
        } catch (e) {
            this.config = {};
        }
    }

    getChannel() {
        return 'sms';
    }

    getProviderId() {
        return 'twilio';
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
            if (!request || !request.to || !request.message) {
                return { success: false, error: 'Numero destinatario e testo del messaggio sono obbligatori' };
            }

            if (!this.config.accountSid || !this.config.authToken || !this.config.fromNumber) {
                return { success: false, error: 'Credenziali Twilio SMS incomplete' };
            }

            const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
            const authHeader = 'Basic ' + Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');

            const params = new URLSearchParams();
            params.append('To', request.to);
            params.append('From', this.config.fromNumber);
            params.append('Body', request.message);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.message || `Errore HTTP ${response.status}` };
            }

            return {
                success: true,
                messageId: data.sid || null
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async healthCheck() {
        try {
            if (!this.config.accountSid || !this.config.authToken) {
                return { healthy: false, details: 'Credenziali non configurate' };
            }
            return { healthy: true, details: 'Configurazione Twilio valida' };
        } catch (e) {
            return { healthy: false, details: e.message };
        }
    }
}

module.exports = TwilioSmsProvider;
