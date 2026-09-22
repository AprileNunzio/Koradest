'use strict';

class AutonomousAgentCoordinator {
    constructor() {
        try {
            this.agents = new Map();
            this.agentStatuses = new Map();
            this.loopTimer = null;
            this.isTicking = false;
        } catch (e) {
            this.agents = new Map();
            this.agentStatuses = new Map();
            this.loopTimer = null;
            this.isTicking = false;
        }
    }

    registerAgent(agentName, agentInstance) {
        try {
            if (!agentName || !agentInstance || typeof agentInstance.tick !== 'function') {
                return false;
            }
            this.agents.set(agentName, agentInstance);
            this.agentStatuses.set(agentName, {
                status: 'IDLE',
                lastTick: null,
                lastError: null,
                reconciledCount: 0
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    start(intervalMs = 30000) {
        try {
            if (this.loopTimer) return true;
            this.loopTimer = setInterval(async () => {
                try {
                    await this.tickAll();
                } catch (e) {
                    return;
                }
            }, intervalMs);

            if (this.loopTimer.unref) {
                this.loopTimer.unref();
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    stop() {
        try {
            if (this.loopTimer) {
                clearInterval(this.loopTimer);
                this.loopTimer = null;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async tickAll() {
        try {
            if (this.isTicking) return;
            this.isTicking = true;

            for (const [name, agent] of this.agents.entries()) {
                const statusRecord = this.agentStatuses.get(name);
                try {
                    statusRecord.status = 'RUNNING';
                    statusRecord.lastTick = Date.now();
                    const result = await agent.tick();
                    statusRecord.status = 'HEALTHY';
                    if (result && result.reconciled) {
                        statusRecord.reconciledCount += result.reconciled;
                    }
                } catch (agentErr) {
                    statusRecord.status = 'DEGRADED';
                    statusRecord.lastError = agentErr.message;
                }
            }

            this.isTicking = false;
        } catch (e) {
            this.isTicking = false;
        }
    }

    getStatusReport() {
        try {
            const report = {};
            for (const [name, status] of this.agentStatuses.entries()) {
                report[name] = Object.assign({}, status);
            }
            return report;
        } catch (e) {
            return {};
        }
    }
}

module.exports = new AutonomousAgentCoordinator();
