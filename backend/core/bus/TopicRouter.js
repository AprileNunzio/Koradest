'use strict';

class TopicRouter {
    constructor() {
        try {
            this.subscriptions = new Map();
        } catch (e) {
            this.subscriptions = new Map();
        }
    }

    static matches(pattern, topic) {
        try {
            if (!pattern || !topic) return false;
            if (pattern === topic || pattern === '>' || pattern === '**') return true;

            const patternParts = pattern.split('.');
            const topicParts = topic.split('.');

            let pIdx = 0;
            let tIdx = 0;

            while (pIdx < patternParts.length && tIdx < topicParts.length) {
                const p = patternParts[pIdx];
                const t = topicParts[tIdx];

                if (p === '>' || p === '**') {
                    return true;
                }

                if (p === '*' || p === t) {
                    pIdx++;
                    tIdx++;
                    continue;
                }

                return false;
            }

            if (pIdx < patternParts.length && (patternParts[pIdx] === '>' || patternParts[pIdx] === '**')) {
                return true;
            }

            return pIdx === patternParts.length && tIdx === topicParts.length;
        } catch (e) {
            return false;
        }
    }

    subscribe(pattern, handler, metadata = {}) {
        try {
            if (!pattern || typeof handler !== 'function') {
                return null;
            }
            if (!this.subscriptions.has(pattern)) {
                this.subscriptions.set(pattern, new Set());
            }
            const subscriptionRecord = {
                id: Math.random().toString(36).substring(2, 11),
                pattern,
                handler,
                metadata
            };
            this.subscriptions.get(pattern).add(subscriptionRecord);
            return subscriptionRecord.id;
        } catch (e) {
            return null;
        }
    }

    unsubscribe(pattern, subscriptionId) {
        try {
            if (!this.subscriptions.has(pattern)) return false;
            const set = this.subscriptions.get(pattern);
            for (const item of set) {
                if (item.id === subscriptionId) {
                    set.delete(item);
                    if (set.size === 0) {
                        this.subscriptions.delete(pattern);
                    }
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    findMatchingHandlers(topic) {
        try {
            const matches = [];
            for (const [pattern, subscribers] of this.subscriptions.entries()) {
                if (TopicRouter.matches(pattern, topic)) {
                    for (const sub of subscribers) {
                        matches.push(sub);
                    }
                }
            }
            return matches;
        } catch (e) {
            return [];
        }
    }
}

module.exports = TopicRouter;
