'use strict';

class CommunicationGateway {
    constructor() {
        try {
            this.providers = new Map();
            this.activeProviders = new Map();
            this.spoolQueue = [];
            this.isProcessingSpool = false;
        } catch (e) {
            this.providers = new Map();
            this.activeProviders = new Map();
            this.spoolQueue = [];
            this.isProcessingSpool = false;
        }
    }

    registerProvider(provider, isDefault = false) {
        try {
            if (!provider || typeof provider.getChannel !== 'function' || typeof provider.getProviderId !== 'function') {
                return false;
            }

            const channel = provider.getChannel();
            const id = provider.getProviderId();

            if (!this.providers.has(channel)) {
                this.providers.set(channel, new Map());
            }

            this.providers.get(channel).set(id, provider);

            if (isDefault || !this.activeProviders.has(channel)) {
                this.activeProviders.set(channel, id);
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    setActiveProvider(channel, providerId) {
        try {
            if (this.providers.has(channel) && this.providers.get(channel).has(providerId)) {
                this.activeProviders.set(channel, providerId);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    getProvider(channel) {
        try {
            const activeId = this.activeProviders.get(channel);
            if (!activeId || !this.providers.has(channel)) return null;
            return this.providers.get(channel).get(activeId) || null;
        } catch (e) {
            return null;
        }
    }

    async send(channel, request, options = {}) {
        try {
            const provider = this.getProvider(channel);
            if (!provider) {
                if (options.queueIfUnavailable !== false) {
                    this._enqueueSpool(channel, request, 'Nessun provider attivo');
                    return { success: true, queued: true, message: 'Messaggio accodato nello spool offline' };
                }
                return { success: false, error: `Nessun provider registrato per il canale: ${channel}` };
            }

            const result = await provider.send(request);
            if (result.success) {
                return result;
            }

            if (options.queueOnFailure !== false) {
                this._enqueueSpool(channel, request, result.error);
                return { success: true, queued: true, originalError: result.error };
            }

            return result;
        } catch (e) {
            if (options.queueOnFailure !== false) {
                this._enqueueSpool(channel, request, e.message);
                return { success: true, queued: true, originalError: e.message };
            }
            return { success: false, error: e.message };
        }
    }

    _enqueueSpool(channel, request, lastError) {
        try {
            this.spoolQueue.push({
                id: Math.random().toString(36).substring(2, 9),
                channel,
                request,
                attempts: 1,
                lastError: lastError || '',
                timestamp: Date.now()
            });
        } catch (e) {
            return;
        }
    }

    getSpoolSize() {
        try {
            return this.spoolQueue.length;
        } catch (e) {
            return 0;
        }
    }

    async processSpool() {
        try {
            if (this.isProcessingSpool || this.spoolQueue.length === 0) {
                return { processed: 0, remaining: this.spoolQueue.length };
            }

            this.isProcessingSpool = true;
            const remaining = [];
            let processedCount = 0;

            for (const item of this.spoolQueue) {
                try {
                    const provider = this.getProvider(item.channel);
                    if (!provider) {
                        remaining.push(item);
                        continue;
                    }

                    const res = await provider.send(item.request);
                    if (res && res.success) {
                        processedCount++;
                    } else {
                        item.attempts++;
                        item.lastError = res ? res.error : 'Invio fallito';
                        if (item.attempts < 5) {
                            remaining.push(item);
                        }
                    }
                } catch (sendErr) {
                    item.attempts++;
                    item.lastError = sendErr.message;
                    if (item.attempts < 5) {
                        remaining.push(item);
                    }
                }
            }

            this.spoolQueue = remaining;
            this.isProcessingSpool = false;
            return { processed: processedCount, remaining: this.spoolQueue.length };
        } catch (e) {
            this.isProcessingSpool = false;
            return { processed: 0, remaining: this.spoolQueue.length, error: e.message };
        }
    }

    async healthCheckAll() {
        try {
            const report = {};
            for (const [channel, map] of this.providers.entries()) {
                report[channel] = {};
                for (const [providerId, instance] of map.entries()) {
                    try {
                        const check = await instance.healthCheck();
                        report[channel][providerId] = check;
                    } catch (checkErr) {
                        report[channel][providerId] = { healthy: false, details: checkErr.message };
                    }
                }
            }
            return report;
        } catch (e) {
            return {};
        }
    }
}

module.exports = new CommunicationGateway();
