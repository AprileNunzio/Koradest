'use strict';

const LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_2FA_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const LOGIN_BACKOFF_STEPS_MS = [0, 0, 0, 1000, 2000, 5000, 10000, 15000, 20000, 30000];

const _loginChallenges = new Map();
const _loginAttempts = new Map();

function _cleanupLoginChallenges() {
    const adesso = Date.now();
    for (const [token, valore] of _loginChallenges.entries()) {
        if (valore.expiresAt < adesso) _loginChallenges.delete(token);
    }
}

function _cleanupLoginAttempts() {
    const adesso = Date.now();
    for (const [id, valore] of _loginAttempts.entries()) {
        if (adesso - valore.lastAttempt > LOGIN_LOCKOUT_MS) _loginAttempts.delete(id);
    }
}

function isLoginLocked(id) {
    try {
        _cleanupLoginAttempts();
        const voce = _loginAttempts.get(id);
        if (!voce) return { locked: false, waitMs: 0 };
        const trascorso = Date.now() - voce.lastAttempt;
        if (voce.count >= MAX_LOGIN_ATTEMPTS) {
            if (trascorso < LOGIN_LOCKOUT_MS) return { locked: true, waitMs: LOGIN_LOCKOUT_MS - trascorso };
            _loginAttempts.delete(id);
            return { locked: false, waitMs: 0 };
        }
        const passo = Math.min(voce.count, LOGIN_BACKOFF_STEPS_MS.length - 1);
        const attesa = LOGIN_BACKOFF_STEPS_MS[passo];
        if (trascorso < attesa) return { locked: true, waitMs: attesa - trascorso };
        return { locked: false, waitMs: 0 };
    } catch (errore) {
        console.error('[RateLimiter] Valutazione del blocco non riuscita, accesso negato per prudenza:', errore.message);
        return { locked: true, waitMs: LOGIN_BACKOFF_STEPS_MS[LOGIN_BACKOFF_STEPS_MS.length - 1] };
    }
}

function registerLoginFailure(id) {
    const voce = _loginAttempts.get(id) || { count: 0, lastAttempt: 0 };
    voce.count++;
    voce.lastAttempt = Date.now();
    _loginAttempts.set(id, voce);
    return voce.count;
}

function registerLoginSuccess(id) {
    return _loginAttempts.delete(id);
}

function setChallenge(token, dati) {
    _cleanupLoginChallenges();
    _loginChallenges.set(token, dati);
    return true;
}

function getChallenge(token) {
    _cleanupLoginChallenges();
    return _loginChallenges.get(token) || null;
}

function deleteChallenge(token) {
    return _loginChallenges.delete(token);
}

function statoAttuale() {
    return { tentativiTracciati: _loginAttempts.size, sfideAperte: _loginChallenges.size };
}

module.exports = {
    isLoginLocked,
    registerLoginFailure,
    registerLoginSuccess,
    setChallenge,
    getChallenge,
    deleteChallenge,
    statoAttuale,
    MAX_2FA_ATTEMPTS,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_LOCKOUT_MS,
    LOGIN_CHALLENGE_TTL_MS
};
