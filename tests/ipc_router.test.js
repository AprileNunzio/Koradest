const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');

const registrati = new Map();
const fakeIpcMain = {
    handle: (canale, handler) => {
        if (registrati.has(canale)) console.warn('DUPLICATO: ' + canale);
        registrati.set(canale, handler);
    },
    removeHandler: () => {},
    on: () => {}
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'koradest-router-'));
const stubElectron = {
    ipcMain: fakeIpcMain,
    app: { getPath: () => tmp, getVersion: () => '2.0.28', on: () => {}, isPackaged: true, whenReady: () => Promise.resolve() },
    BrowserWindow: { getAllWindows: () => [], getFocusedWindow: () => null },
    safeStorage: { isEncryptionAvailable: () => false },
    shell: { openExternal: async () => true },
    dialog: {},
    session: {},
    protocol: { registerSchemesAsPrivileged: () => {} }
};
const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'electron') return stubElectron;
    return originalLoad.apply(this, arguments);
};

const router = require(path.resolve('backend/core/ipcRouter'));
const policy = require(path.resolve('backend/security/ipc_policy'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

router.registerAllIPCHandlers({ getMainWindow: () => null, createWindow: () => {}, createMenu: () => {}, createTray: () => {} });

console.log('Canali registrati a runtime: ' + registrati.size);
const classificati = new Set(policy.classifiedChannels());
const scoperti = [...registrati.keys()].filter(c => !classificati.has(c));

check('la registrazione non solleva eccezioni', registrati.size > 200);
check('ogni canale registrato ha una politica', scoperti.length === 0);
if (scoperti.length > 0) console.log('  scoperti: ' + scoperti.join(', '));
check('i canali delle reti sono registrati', registrati.has('networks:list') && registrati.has('networks:setAutoStart'));
check('i canali critici sono registrati', registrati.has('rbac:setGroupPermission') && registrati.has('gdpr:eraseSubject'));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
