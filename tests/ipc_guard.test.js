const Module = require('module');
const path = require('path');

let permessiCorrenti = [];
const originalLoad = Module._load;
Module._load = function (request, parent) {
    if (request === 'electron') return { app: { getPath: () => '.', on: () => {} }, BrowserWindow: { getAllWindows: () => [] } };
    if (request.endsWith('handlers/rbac')) return { getEffectiveUserPermissions: () => permessiCorrenti };
    if (request.endsWith('observability/auditLogger')) return { logEvent: () => true };
    return originalLoad.apply(this, arguments);
};

const guard = require(path.resolve('backend/security/ipc_guard'));
const sessionManager = require(path.resolve('backend/core/session_manager'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const esito = (canale) => guard.authorize(canale).allowed;

console.log('--- nessuna sessione ---');
sessionManager.clearSession();
permessiCorrenti = [];
check('login consentito senza sessione', esito('loginUser'));
check('elenco reti consentito senza sessione', esito('networks:list'));
check('controlli finestra consentiti', esito('window-close'));
check('cancellazione utente NEGATA senza sessione', !esito('usersDelete'));
check('modifica permessi di gruppo NEGATA senza sessione', !esito('rbac:setGroupPermission'));
check('codice di rete NEGATO senza sessione', !esito('networks:revealCode'));
check('cancellazione GDPR NEGATA senza sessione', !esito('gdpr:eraseSubject'));
check('canale inesistente NEGATO', !esito('canale:inventato'));

console.log('\n--- utente semplice, nessun permesso ---');
sessionManager.setSession('utente-base');
permessiCorrenti = [];
check('lettura notifiche consentita', esito('notifications:list'));
check('cambio propria password consentito', esito('usersChangeOwnPassword'));
check('creazione utenti NEGATA', !esito('usersCreate'));
check('scrittura anagrafica NEGATA', !esito('anagrafica:persone:create'));
check('escalation permessi NEGATA', !esito('rbac:setUserPermission'));
check('reset blockchain NEGATO', !esito('blockchainRebuild'));

console.log('\n--- utente con delega anagrafica ---');
permessiCorrenti = ['anagrafica:view', 'anagrafica:create'];
check('lettura anagrafica consentita', esito('anagrafica:persone:getAll'));
check('creazione anagrafica consentita', esito('anagrafica:persone:create'));
check('creazione documento consentita', esito('anagrafica:documenti:create'));
check('modifica anagrafica NEGATA (manca edit)', !esito('anagrafica:persone:update'));
check('gestione utenti NEGATA', !esito('usersCreate'));

console.log('\n--- delega amministrativa sugli utenti ---');
permessiCorrenti = ['amministratore:utenti:view', 'amministratore:utenti:edit'];
check('modifica utenti consentita', esito('usersUpdate'));
check('creazione utenti NEGATA (manca create)', !esito('usersCreate'));
check('cancellazione definitiva NEGATA (solo superadmin)', !esito('usersHardDelete'));
check('modifica RBAC NEGATA', !esito('rbac:setGroupPermission'));

console.log('\n--- superadmin ---');
permessiCorrenti = ['*'];
check('superadmin puo gestire RBAC', esito('rbac:setGroupPermission'));
check('superadmin puo cancellare definitivamente', esito('usersHardDelete'));
check('superadmin puo leggere il codice di rete', esito('networks:revealCode'));
check('superadmin NON supera un canale non classificato', !esito('canale:inventato'));

sessionManager.clearSession();
console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
