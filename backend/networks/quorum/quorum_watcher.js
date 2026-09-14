'use strict';
const quorumEvaluator = require('./quorum_evaluator');
const bus = require('../../core/event_bus');

const POLL_INTERVAL_MS = 5000;
let _timer = null;
let _lostSince = 0;
let _lastSatisfied = null;

function _broadcast(channel, payload) {
    try {
        const { BrowserWindow } = require('electron');
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) win.webContents.send(channel, payload);
        }
    } catch (_) {}
}

function _enforce(state) {
    const sessionManager = require('../../core/session_manager');
    if (!sessionManager.isAuthenticated()) return;
    sessionManager.clearSession();
    _broadcast('network:quorum-lost', {
        required: state.required,
        current: state.current,
        message: quorumEvaluator.describe(state)
    });
    bus.publish('network:quorum-lost', state);
}

function _tick() {
    const state = quorumEvaluator.evaluate();
    if (!state.active) return;
    if (state.satisfied !== _lastSatisfied) {
        _lastSatisfied = state.satisfied;
        _broadcast('network:quorum-changed', state);
    }
    if (state.satisfied) {
        _lostSince = 0;
        return;
    }
    if (state.enforcement !== 'hard') return;
    const now = Date.now();
    if (_lostSince === 0) {
        _lostSince = now;
        return;
    }
    if (now - _lostSince >= state.graceMs) {
        _lostSince = 0;
        _enforce(state);
    }
}

function start() {
    if (_timer) return false;
    _lostSince = 0;
    _lastSatisfied = null;
    _timer = setInterval(_tick, POLL_INTERVAL_MS);
    if (typeof _timer.unref === 'function') _timer.unref();
    return true;
}

function stop() {
    if (!_timer) return false;
    clearInterval(_timer);
    _timer = null;
    _lostSince = 0;
    _lastSatisfied = null;
    return true;
}

module.exports = { start, stop, POLL_INTERVAL_MS };
