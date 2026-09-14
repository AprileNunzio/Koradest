'use strict';
const passwordHasher = require('./password_hasher');
const { isLoginLocked, registerLoginFailure, registerLoginSuccess } = require('./auth_rate_limiter');

const CAMPI = ['pin', 'password'];

function _expected(code, message) {
    const err = new Error(code);
    err.isExpected = true;
    err.userMessage = message;
    return err;
}

async function verifyCurrentUser(credential, azione) {
    const sessionManager = require('../core/session_manager');
    const userId = sessionManager.getCurrentUserId();
    if (!userId) throw _expected('STEP_UP_NO_SESSION', 'Nessuna sessione attiva.');
    if (typeof credential !== 'string' || credential.length === 0) {
        throw _expected('STEP_UP_CREDENTIAL_REQUIRED', 'Inserisci il tuo PIN o la tua password per confermare.');
    }
    const stato = isLoginLocked(userId);
    if (stato.locked) {
        throw _expected('STEP_UP_LOCKED', 'Troppi tentativi falliti. Riprova tra qualche istante.');
    }
    const { getDB } = require('../db');
    const righe = getDB().query('SELECT pin, password FROM users WHERE id = ?', [userId]);
    if (!righe || righe.length === 0) throw _expected('STEP_UP_NO_SESSION', 'Utente non trovato.');
    const utente = righe[0];
    for (const campo of CAMPI) {
        if (!utente[campo]) continue;
        const { valid } = await passwordHasher.verify(credential, utente[campo]);
        if (valid) {
            registerLoginSuccess(userId);
            _audit(userId, azione, 'SUCCESS');
            return userId;
        }
    }
    registerLoginFailure(userId);
    _audit(userId, azione, 'DENIED');
    throw _expected('STEP_UP_INVALID', 'PIN o password non corretti.');
}

function _audit(userId, azione, esito) {
    try {
        require('../observability/auditLogger').logEvent(userId, 'STEP_UP_AUTH', 'sensitive_action', azione || '', null, esito);
    } catch (_) {}
}

module.exports = { verifyCurrentUser };
