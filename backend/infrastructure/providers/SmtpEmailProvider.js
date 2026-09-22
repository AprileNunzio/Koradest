'use strict';

const ICommunicationProvider = require('../ICommunicationProvider');

class SmtpEmailProvider extends ICommunicationProvider {
    constructor(config = {}) {
        super();
        try {
            this.config = config;
            this.nodemailer = null;
        } catch (e) {
            this.config = {};
            this.nodemailer = null;
        }
    }

    _getMailer() {
        try {
            if (!this.nodemailer) {
                this.nodemailer = require('nodemailer');
            }
            return this.nodemailer;
        } catch (e) {
            return null;
        }
    }

    getChannel() {
        return 'email';
    }

    getProviderId() {
        return 'smtp';
    }

    updateConfig(newConfig) {
        try {
            this.config = Object.assign({}, this.config, newConfig || {});
            return true;
        } catch (e) {
            return false;
        }
    }

    _createTransport() {
        try {
            const mailer = this._getMailer();
            if (!mailer) return null;

            const transportOpts = {
                host: this.config.smtp_host,
                port: parseInt(this.config.smtp_port, 10) || 587,
                secure: this.config.smtp_security === 'ssl' || this.config.smtp_port == 465,
                auth: {
                    user: this.config.smtp_user,
                    pass: this.config.smtp_pass
                },
                tls: {
                    rejectUnauthorized: !this.config.smtp_allow_self_signed
                }
            };

            if (this.config.smtp_security === 'starttls') {
                transportOpts.secure = false;
                transportOpts.requireTLS = true;
            } else if (this.config.smtp_security === 'none') {
                transportOpts.secure = false;
                transportOpts.ignoreTLS = true;
            }

            return mailer.createTransport(transportOpts);
        } catch (e) {
            return null;
        }
    }

    async send(request) {
        try {
            if (!request || !request.to || !request.subject) {
                return { success: false, error: 'Destinatario e oggetto sono obbligatori' };
            }

            if (!this.config.smtp_host || !this.config.smtp_user) {
                return { success: false, error: 'Server SMTP non configurato' };
            }

            const transport = this._createTransport();
            if (!transport) {
                return { success: false, error: 'Inizializzazione trasporto SMTP fallita' };
            }

            const from = this.config.smtp_sender_name
                ? `"${this.config.smtp_sender_name}" <${this.config.smtp_sender_email}>`
                : this.config.smtp_sender_email;

            const mailOptions = {
                from: from || this.config.smtp_user,
                to: request.to,
                subject: request.subject,
                text: request.text || '',
                html: request.html || '',
                attachments: request.attachments || []
            };

            const info = await transport.sendMail(mailOptions);
            return {
                success: true,
                messageId: info ? info.messageId : null
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async healthCheck() {
        try {
            if (!this.config.smtp_host) {
                return { healthy: false, details: 'Host SMTP non specificato' };
            }
            const transport = this._createTransport();
            if (!transport) {
                return { healthy: false, details: 'Trasporto non istanziabile' };
            }
            await transport.verify();
            return { healthy: true, details: 'Connessione SMTP verificata' };
        } catch (e) {
            return { healthy: false, details: e.message };
        }
    }
}

module.exports = SmtpEmailProvider;
