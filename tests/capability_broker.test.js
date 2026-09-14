const Module = require('module');
const path = require('path');
const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'electron') return { app: { getPath: () => '.', on: () => {} } };
    if (request.endsWith('observability/auditLogger')) return { logEvent: () => true };
    if (request.endsWith('observability/appMetrics')) return { recordIpcInvocation: () => true };
    return originalLoad.apply(this, arguments);
};
const broker = require(path.resolve('backend/security/capabilityBroker'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const puo = (src, dst, action, origin = 'ipc') => broker.authorizeCall(src, dst, action, origin).allowed;

broker.generateAppToken('app_contabilita', []);
broker.generateAppToken('app_magazzino', ['app:app_contabilita:leggiFatture']);
broker.generateAppToken('anagrafica', ['*']);

console.log('--- impersonificazione del core ---');
check('un app NON puo spacciarsi per "core" via IPC', !puo('core', 'anagrafica', 'qualsiasi'));
check('un app NON puo spacciarsi per "core:gdpr" via IPC', !puo('core:gdpr', 'anagrafica', 'qualsiasi'));
check('il processo principale puo usare "core"', puo('core', 'anagrafica', 'qualsiasi', 'main'));

console.log('\n--- applicazioni sconosciute ---');
check('una sorgente inventata viene rifiutata', !puo('app_inesistente', 'anagrafica', 'leggiTutto'));
check('una sorgente vuota viene rifiutata', !puo('', 'anagrafica', 'leggiTutto'));
check('una sorgente sconosciuta NON riceve piu un token automatico', !broker.isKnownApp('app_inesistente'));

console.log('\n--- chiamate a se stessi ---');
check('un app puo chiamare il proprio backend', puo('app_contabilita', 'app_contabilita', 'calcolaIva'));
check('gli alias della stessa app sono equivalenti', puo('app_contabilita', 'app-contabilita', 'calcolaIva'));

console.log('\n--- chiamate fra applicazioni ---');
check('senza permesso dichiarato la chiamata incrociata e negata', !puo('app_contabilita', 'app_magazzino', 'leggiGiacenze'));
check('con permesso dichiarato la chiamata incrociata passa', puo('app_magazzino', 'app_contabilita', 'leggiFatture'));
check('il permesso vale solo per l azione dichiarata', !puo('app_magazzino', 'app_contabilita', 'cancellaFatture'));
check('un app con scope "*" puo chiamare chiunque', puo('anagrafica', 'app_contabilita', 'qualsiasi'));

console.log('\n--- permessi predefiniti dei manifest ---');
const AppLoaderSrc = require('fs').readFileSync('backend/core/AppLoader.js', 'utf8');
check('le app non core non ricevono piu "*" per difetto', /manifest\.core === true \? \['\*'\] : \[\]/.test(AppLoaderSrc));

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
