'use strict';

class OllamaDataProtector {
    constructor() {
        try {
            this.injectionPatterns = [
                /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)/i,
                /system\s+prompt\s+override/i,
                /you\s+are\s+now\s+in\s+developer\s+mode/i,
                /reveal\s+(system|admin|root)\s+(password|prompt|token|key)/i,
                /dump\s+(all\s+)?(database|users|credentials|vault)/i,
                /<script[\s\S]*?>[\s\S]*?<\/script>/i,
                /ignora\s+(tutte\s+le\s+|le\s+)?(istruzioni|regole|direttive)\s+(precedenti|di\s+sistema)/i,
                /dimentica\s+(tutte\s+le\s+)?(istruzioni|regole)(\s+precedenti)?/i,
                /sei\s+(ora\s+)?in\s+modalit[àa]\s+(sviluppatore|debug|admin|god|non\s+filtrata)/i,
                /rivela\s+(la\s+)?(password|token|chiave)\s+(di\s+)?(sistema|admin|root)/i,
                /mostra(mi)?\s+(tutto\s+il\s+)?(database|tutti\s+gli\s+utenti|credenziali|vault)/i,
                /agisci\s+come\s+se\s+non\s+avessi\s+(restrizioni|regole|limiti)/i,
                /sblocca\s+(la\s+)?modalit[àa]\s+(sviluppatore|non\s+filtrata|nascosta)/i,
                /prompt\s+di\s+sistema\s+(sovrascritto|ignorato|violato)/i
            ];

            this.piiPatterns = [
                { regex: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi, replacement: '[CODICE_FISCALE_MASKED]' },
                { regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi, replacement: '[IBAN_MASKED]' },
                { regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replacement: '[CREDIT_CARD_MASKED]' },
                { regex: /(bearer\s+[a-zA-Z0-9_\-\.]{20,})/gi, replacement: '[BEARER_TOKEN_MASKED]' },
                { regex: /(password|secret|pwd|pass)\s*[:=]\s*['"][^'"]+['"]/gi, replacement: '$1: "[PASSWORD_MASKED]"' }
            ];

            this.protectedCodeSignatures = [
                /BEGIN\s+PRIVATE\s+KEY/i,
                /BEGIN\s+RSA\s+PRIVATE\s+KEY/i,
                /networks\.vault/i,
                /auth\.enc/i,
                /masterKey/i
            ];
        } catch (e) {
            this.injectionPatterns = [];
            this.piiPatterns = [];
            this.protectedCodeSignatures = [];
        }
    }

    _normalizeForDetection(text) {
        try {
            return String(text)
                .normalize('NFKC')
                .replace(/[​-‏﻿]/g, '')
                .replace(/\s+/g, ' ');
        } catch (e) {
            return String(text || '');
        }
    }

    _matchesInjection(text) {
        try {
            const normalized = this._normalizeForDetection(text);
            return this.injectionPatterns.some(pattern => pattern.test(normalized));
        } catch (e) {
            return false;
        }
    }

    sanitizeInputPrompt(prompt) {
        try {
            if (!prompt || typeof prompt !== 'string') return { safe: true, text: '' };

            if (this._matchesInjection(prompt)) {
                return {
                    safe: false,
                    error: 'Potential prompt injection attempt detected',
                    text: null
                };
            }

            let sanitized = prompt;
            for (const { regex, replacement } of this.piiPatterns) {
                sanitized = sanitized.replace(regex, replacement);
            }

            return { safe: true, text: sanitized };
        } catch (e) {
            return { safe: false, error: e.message };
        }
    }

    sanitizeModelOutput(text) {
        try {
            if (!text || typeof text !== 'string') return text;

            for (const sig of this.protectedCodeSignatures) {
                if (sig.test(text)) {
                    return '[REDACTED BY KORADEST SECURITY: SENSITIVE SYSTEM DATA BLOCKED]';
                }
            }

            let sanitized = text;
            for (const { regex, replacement } of this.piiPatterns) {
                sanitized = sanitized.replace(regex, replacement);
            }

            return sanitized;
        } catch (e) {
            return text;
        }
    }

    sanitizeToolOutput(text) {
        try {
            if (!text || typeof text !== 'string') return { safe: true, text };

            if (this._matchesInjection(text)) {
                return {
                    safe: false,
                    text: '[DATO SCARTATO DA KORADEST SECURITY: il risultato dello strumento conteneva testo simile a un tentativo di prompt injection]'
                };
            }

            for (const sig of this.protectedCodeSignatures) {
                if (sig.test(text)) {
                    return { safe: false, text: '[REDACTED BY KORADEST SECURITY: SENSITIVE SYSTEM DATA BLOCKED]' };
                }
            }

            let sanitized = text;
            for (const { regex, replacement } of this.piiPatterns) {
                sanitized = sanitized.replace(regex, replacement);
            }

            return { safe: true, text: sanitized };
        } catch (e) {
            return { safe: true, text };
        }
    }
}

module.exports = new OllamaDataProtector();
