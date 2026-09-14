'use strict';

const bus = require('./event_bus');

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_FAILURES = 5;

const circuitStates = new Map();

function getCircuitState(appId) {
    try {
        if (!circuitStates.has(appId)) {
            circuitStates.set(appId, {
                failures: 0,
                lastFailureTime: 0,
                isOpen: false,
                totalCalls: 0,
                totalErrors: 0
            });
        }
        return circuitStates.get(appId);
    } catch (_) {
        return { failures: 0, lastFailureTime: 0, isOpen: false, totalCalls: 0, totalErrors: 0 };
    }
}

function recordSuccess(appId) {
    try {
        const state = getCircuitState(appId);
        state.failures = 0;
        state.isOpen = false;
        state.totalCalls++;
    } catch (_) {}
}

function recordFailure(appId, error) {
    try {
        const state = getCircuitState(appId);
        state.failures++;
        state.totalErrors++;
        state.totalCalls++;
        state.lastFailureTime = Date.now();

        if (state.failures >= MAX_FAILURES && !state.isOpen) {
            state.isOpen = true;
            bus.publish('app:circuit-open', { appId, failures: state.failures, error: error.message });
        }
    } catch (_) {}
}

function resetCircuit(appId) {
    try {
        circuitStates.delete(appId);
    } catch (_) {}
}

async function guardAction(appId, actionName, fn, timeoutMs = DEFAULT_TIMEOUT_MS) {
    try {
        const state = getCircuitState(appId);
        if (state.isOpen) {
            const timeSinceFail = Date.now() - state.lastFailureTime;
            if (timeSinceFail < 30000) {
                return { success: false, error: 'Circuit breaker aperto per ' + appId + ': troppi errori consecutivi. Riprova tra breve.' };
            }
            state.isOpen = false;
            state.failures = 0;
        }

        let timeoutId = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Timeout operazione (' + timeoutMs + 'ms) superato per ' + appId + ':' + actionName));
            }, timeoutMs);
        });

        try {
            const result = await Promise.race([fn(), timeoutPromise]);
            clearTimeout(timeoutId);
            recordSuccess(appId);
            return result;
        } catch (execErr) {
            clearTimeout(timeoutId);
            recordFailure(appId, execErr);
            throw execErr;
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getCircuitStatus(appId) {
    try {
        return getCircuitState(appId);
    } catch (_) {
        return null;
    }
}

module.exports = {
    guardAction,
    getCircuitStatus,
    resetCircuit
};
