'use strict';

const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 12000;
const CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

class OllamaConversationMemory {
    constructor() {
        try {
            this.conversations = new Map();
            this._startCleanup();
        } catch (e) {
            this.conversations = new Map();
        }
    }

    _key(userId, conversationId) {
        return `${userId || 'anonymous'}::${conversationId || 'default'}`;
    }

    _trim(record) {
        try {
            while (record.messages.length > MAX_MESSAGES) {
                record.messages.shift();
            }
            let totalChars = record.messages.reduce((sum, m) => sum + (m.content ? m.content.length : 0), 0);
            while (totalChars > MAX_TOTAL_CHARS && record.messages.length > 2) {
                const removed = record.messages.shift();
                totalChars -= (removed.content ? removed.content.length : 0);
            }
        } catch (e) {}
    }

    getHistory(userId, conversationId) {
        try {
            if (!conversationId) return [];
            const record = this.conversations.get(this._key(userId, conversationId));
            return record ? record.messages.slice() : [];
        } catch (e) {
            return [];
        }
    }

    appendTurn(userId, conversationId, userMessage, assistantMessage) {
        try {
            if (!conversationId) return false;
            const key = this._key(userId, conversationId);
            const record = this.conversations.get(key) || { messages: [], lastActivity: Date.now() };

            if (userMessage) record.messages.push({ role: 'user', content: String(userMessage) });
            if (assistantMessage) record.messages.push({ role: 'assistant', content: String(assistantMessage) });
            record.lastActivity = Date.now();

            this._trim(record);
            this.conversations.set(key, record);
            return true;
        } catch (e) {
            return false;
        }
    }

    reset(userId, conversationId) {
        try {
            if (!conversationId) return false;
            return this.conversations.delete(this._key(userId, conversationId));
        } catch (e) {
            return false;
        }
    }

    _startCleanup() {
        try {
            const timer = setInterval(() => {
                try {
                    const now = Date.now();
                    for (const [key, record] of this.conversations.entries()) {
                        if (now - record.lastActivity > CONVERSATION_TTL_MS) {
                            this.conversations.delete(key);
                        }
                    }
                } catch (e) {}
            }, CLEANUP_INTERVAL_MS);
            if (timer.unref) timer.unref();
        } catch (e) {}
    }
}

module.exports = new OllamaConversationMemory();
