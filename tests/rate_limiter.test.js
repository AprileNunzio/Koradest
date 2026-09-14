const path = require('path');
const limiter = require(path.resolve('backend/security/auth_rate_limiter'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

const UTENTE = 'utente-prova';

check('un utente senza tentativi non e bloccato', limiter.isLoginLocked(UTENTE).locked === false);

for (let i = 0; i < 3; i++) limiter.registerLoginFailure(UTENTE);
check('dopo tre fallimenti scatta l attesa progressiva', limiter.isLoginLocked(UTENTE).locked === true);
check('l attesa e dichiarata al chiamante', limiter.isLoginLocked(UTENTE).waitMs > 0);

limiter.registerLoginSuccess(UTENTE);
check('un accesso riuscito azzera i tentativi', limiter.isLoginLocked(UTENTE).locked === false);

for (let i = 0; i < limiter.MAX_LOGIN_ATTEMPTS; i++) limiter.registerLoginFailure(UTENTE);
const bloccato = limiter.isLoginLocked(UTENTE);
check('raggiunto il massimo scatta il blocco prolungato', bloccato.locked === true);
check('il blocco prolungato dura il periodo previsto', bloccato.waitMs > limiter.LOGIN_LOCKOUT_MS - 5000);
check('il conteggio e tracciato', limiter.statoAttuale().tentativiTracciati >= 1);

const conteggio = limiter.registerLoginFailure('altro-utente');
check('registerLoginFailure riporta il numero di tentativi', conteggio === 1);
check('utenti diversi hanno contatori indipendenti', limiter.isLoginLocked('altro-utente').locked === false);

limiter.setChallenge('token-1', { userId: UTENTE, expiresAt: Date.now() + 60000 });
check('una sfida aperta e recuperabile', limiter.getChallenge('token-1').userId === UTENTE);
limiter.setChallenge('token-scaduto', { userId: UTENTE, expiresAt: Date.now() - 1 });
check('una sfida scaduta non e recuperabile', limiter.getChallenge('token-scaduto') === null);
limiter.deleteChallenge('token-1');
check('una sfida cancellata non e recuperabile', limiter.getChallenge('token-1') === null);

const originale = Date.now;
Date.now = () => { throw new Error('orologio non disponibile'); };
const inErrore = limiter.isLoginLocked(UTENTE);
Date.now = originale;
check('se la valutazione fallisce il limitatore nega invece di aprire', inErrore.locked === true);

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
