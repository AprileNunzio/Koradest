'use strict';

const PUBLIC = [
    'ping',
    'hasConfig',
    'readConfig',
    'saveConfig',
    'checkIsRegistered',
    'getAppStatus',
    'getLocalIPs',
    'getNodeId',
    'logError',
    'window-minimize',
    'window-maximize',
    'window-close',
    'toggleDevTools',
    'checkForUpdates',
    'installPendingUpdate',
    'openGitHub',
    'apriCollegamento',
    'license:status',
    'entitlement:check',
    'checkNetworkProfile',
    'setNetworkProfilePrivate',
    'scanNodes',
    'pingNode',
    'cloneNetwork',
    'getUsersList',
    'loginUser',
    'loginUserVerify2fa',
    'loginWebauthnOptions',
    'logoutUser',
    'registerUser',
    'unlockDatabase',
    'recoverDatabase',
    'resetApp',
    'dbGetBackupStatus',
    'runDiagnostics',
    'exportLogs',
    'networks:list',
    'networks:getActive',
    'networks:create',
    'networks:join',
    'networks:activate',
    'networks:deactivate',
    'networks:rename',
    'networks:remove',
    'networks:setRememberCode',
    'networks:setAutoStart',
    'networks:previewCode',
    'networks:getQuorum',
    'networks:inspectRecoveryShares',
    'networks:restoreFromRecoveryKit'
];

const SESSION = [
    'koradestNative:callAppApi',
    'appBus:registerWindow',
    'appBus:sendMessage',
    'getAppsRegistry',
    'getSubAppsRegistry',
    'getUiExtensions',
    'getDetailedNodes',
    'getExtendedNodeMetrics',
    'getNetworkSyncStatus',
    'forceSync',
    'clearAppCache',
    'getUpdateSettings',
    'openFirewallSettings',
    'forceFirewallRules',
    'forceP2PUpdate',
    'announce-local-update',
    'broadcastLogin',
    'events:publish',
    'events:query',
    'health:getStatus',
    'health:getAppMetrics',
    'sod:check',
    'sso:authenticate',
    'abac:evaluate',
    'system:getDiagnostics',
    'system:getHardwareProfile',
    'fixDiagnostics',
    'usersChangeOwnPassword',
    'usersChangeOwnPin',
    'usersGetAll',
    'getAccessLogs',
    'twofa:getStatus',
    'twofa:totpSetupBegin',
    'twofa:totpSetupConfirm',
    'twofa:totpDisable',
    'twofa:webauthnRegisterBegin',
    'twofa:webauthnRegisterFinish',
    'twofa:webauthnRemove',
    'notifications:getPreferences',
    'notifications:setPreference',
    'notifications:list',
    'notifications:markRead',
    'notifications:create',
    'anagrafica:riferimenti:getProvince',
    'anagrafica:riferimenti:getNazioni',
    'anagrafica:riferimenti:getAllComuni',
    'anagrafica:riferimenti:getSuggestions',
    'store:getAvailable',
    'store:getInstalled',
    'store:getCoreApps',
    'store:getUpdateQueue',
    'store:getAppUpdateState',
    'store:isAppLocked',
    'store:checkUpdates',
    'store:elencaVersioni',
    'store:listRepositories',
    'store:checkClusterHealth',
    'store:getClusterAppMatrix',
    'store:anteprimaDisinstallazione',
    'rbac:getEffectiveUserPermissions'
];

const SUPERADMIN = [
    'getNetworkCode',
    'networks:revealCode',
    'networks:createRecoveryKit',
    'networks:exportArchive',
    'networks:setQuorum',
    'gdpr:eraseSubject',
    'gdpr:exportSubject',
    'gdpr:previewErasure',
    'gdpr:ledgerStats',
    'gdpr:getRetention',
    'gdpr:setRetention',
    'gdpr:runRetention',
    'gdpr:privacyRegister',
    'gdpr:exportPrivacyRegister',
    'blockchainFullResync',
    'blockchainRebuild',
    'forceNetworkDatabaseSync',
    'forceUpdateConsensus',
    'executeNodeAction',
    'system:relaunch',
    'system:forceReloadApp',
    'system:testAppAction',
    'flightRecorder:dump',
    'flightRecorder:get',
    'license:activate',
    'rbac:auditReport',
    'rbac:inspectTrace',
    'rbac:syncPermissionsFromManifests',
    'usersHardDelete',
    'anagrafica:persone:hardDelete',
    'twofa:adminReset',
    'twofa:setPolicy',
    'twofa:adminListStatus'
];

const PERMISSION = {
    'usersCreate': ['amministratore:utenti:create'],
    'usersUpdate': ['amministratore:utenti:edit'],
    'usersDelete': ['amministratore:utenti:edit'],
    'usersRestore': ['amministratore:utenti:edit'],
    'getAllAccessLogs': ['impostazioni:registro_accessi:view', 'amministratore:utenti:view'],
    'getAccessLogsStats': ['impostazioni:registro_accessi:view', 'amministratore:utenti:view'],

    'rbac:getAllUsers': ['amministratore:rbac:view'],
    'rbac:getAllRoles': ['amministratore:rbac:view'],
    'rbac:getAllGroups': ['amministratore:rbac:view'],
    'rbac:getGroupPermissions': ['amministratore:rbac:view'],
    'rbac:getGroupUsers': ['amministratore:rbac:view'],
    'rbac:getUserPermissions': ['amministratore:rbac:view'],
    'rbac:createRole': ['amministratore:rbac:create'],
    'rbac:createGroup': ['amministratore:rbac:create'],
    'rbac:assignRoleToUser': ['amministratore:rbac:edit'],
    'rbac:removeRoleFromUser': ['amministratore:rbac:edit'],
    'rbac:setGroupPermission': ['amministratore:rbac:edit'],
    'rbac:setUserPermission': ['amministratore:rbac:edit'],
    'rbac:updateGroupUsers': ['amministratore:rbac:edit'],

    'datiAzienda:getSedi': ['amministratore:dati_azienda:view'],
    'datiAzienda:getSedeById': ['amministratore:dati_azienda:view'],
    'datiAzienda:saveSede': ['amministratore:dati_azienda:edit'],
    'datiAzienda:deleteSede': ['amministratore:dati_azienda:edit'],

    'testSmtpConnection': ['amministratore:smtp:edit'],
    'sendMail': ['amministratore:smtp:edit'],
    'saveUpdateSettings': ['amministratore:credenziali:edit'],

    'getDistributedLogs': ['amministratore:errori:view'],
    'get_system_logs': ['amministratore:errori:view'],
    'clearDistributedLogs': ['amministratore:errori:manage'],
    'deleteDistributedLog': ['amministratore:errori:manage'],
    'clear_system_logs': ['amministratore:errori:manage'],
    'delete_system_log': ['amministratore:errori:manage'],
    'health:getAuditLogs': ['amministratore:errori:view'],

    'store:install': ['amministratore:create'],
    'store:uninstall': ['amministratore:edit'],
    'store:installaVersione': ['amministratore:edit'],
    'store:rollbackApp': ['amministratore:edit'],
    'store:rollbackAppVersion': ['amministratore:edit'],
    'store:forceCheckUpdates': ['amministratore:edit'],
    'store:addRepository': ['amministratore:edit'],
    'store:removeRepository': ['amministratore:edit'],

    'anagrafica:persone:getAll': ['anagrafica:view', 'gestione_personale:view'],
    'anagrafica:persone:search': ['anagrafica:view', 'gestione_personale:view'],
    'anagrafica:persone:getById': ['anagrafica:view', 'gestione_personale:view'],
    'anagrafica:persone:getByUserId': ['anagrafica:view', 'gestione_personale:view'],
    'anagrafica:persone:getScheda': ['anagrafica:view', 'gestione_personale:view'],
    'anagrafica:audit:getHistory': ['anagrafica:view', 'gestione_personale:view'],
    'anagrafica:persone:create': ['anagrafica:create', 'gestione_personale:create'],
    'anagrafica:persone:update': ['anagrafica:edit', 'gestione_personale:edit'],
    'anagrafica:persone:remove': ['anagrafica:edit', 'gestione_personale:edit'],
    'anagrafica:persone:restore': ['anagrafica:edit', 'gestione_personale:edit']
};

const ANAGRAFICA_SECTIONS = ['documenti', 'residenza', 'contatti', 'familiari', 'lavoro', 'titoliStudio', 'datiBancari'];
const ANAGRAFICA_VERBS = {
    getByPersona: ['anagrafica:view', 'gestione_personale:view'],
    create: ['anagrafica:create', 'gestione_personale:create'],
    update: ['anagrafica:edit', 'gestione_personale:edit'],
    remove: ['anagrafica:edit', 'gestione_personale:edit']
};
for (const section of ANAGRAFICA_SECTIONS) {
    for (const [verb, permissions] of Object.entries(ANAGRAFICA_VERBS)) {
        PERMISSION[`anagrafica:${section}:${verb}`] = permissions;
    }
}

const _index = new Map();
for (const channel of PUBLIC) _index.set(channel, { level: 'public' });
for (const channel of SESSION) _index.set(channel, { level: 'session' });
for (const channel of SUPERADMIN) _index.set(channel, { level: 'superadmin' });
for (const [channel, permissions] of Object.entries(PERMISSION)) {
    _index.set(channel, { level: 'permission', permissions });
}

function resolve(channel) {
    return _index.get(channel) || null;
}

function classifiedChannels() {
    return Array.from(_index.keys()).sort();
}

module.exports = { resolve, classifiedChannels, PUBLIC, SESSION, SUPERADMIN, PERMISSION };
