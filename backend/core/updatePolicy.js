'use strict';

const bus = require('./event_bus');

const ORE = 60 * 60 * 1000;

const INTERVALLI_AMMESSI = [1, 2, 4, 8, 12, 24, 48, 168];

const PREDEFINITI = {
    updates_core_mode: 'auto',
    updates_core_auto_check: true,
    updates_core_check_hours: 4,
    updates_apps_mode: 'auto',
    updates_apps_auto_check: true,
    updates_apps_check_hours: 4,
    auto_clear_cache_on_update: true
};

function _leggiConfigurazione() {
    try {
        const configHandlers = require('../config');
        return configHandlers.readConfig() || {};
    } catch (e) {
        return {};
    }
}

function normalizzaModalita(valore, predefinito) {
    try {
        return valore === 'manual' || valore === 'auto' ? valore : predefinito;
    } catch (e) {
        return predefinito;
    }
}

function normalizzaIntervallo(valore, predefinito) {
    try {
        const ore = Number(valore);
        if (!Number.isFinite(ore)) return predefinito;
        if (!INTERVALLI_AMMESSI.includes(ore)) return predefinito;
        return ore;
    } catch (e) {
        return predefinito;
    }
}

function normalizza(grezze) {
    const conf = grezze || {};
    return {
        updates_core_mode: normalizzaModalita(conf.updates_core_mode, PREDEFINITI.updates_core_mode),
        updates_core_auto_check: conf.updates_core_auto_check !== false,
        updates_core_check_hours: normalizzaIntervallo(conf.updates_core_check_hours, PREDEFINITI.updates_core_check_hours),
        updates_apps_mode: normalizzaModalita(conf.updates_apps_mode, PREDEFINITI.updates_apps_mode),
        updates_apps_auto_check: conf.updates_apps_auto_check !== false,
        updates_apps_check_hours: normalizzaIntervallo(conf.updates_apps_check_hours, PREDEFINITI.updates_apps_check_hours),
        auto_clear_cache_on_update: conf.auto_clear_cache_on_update !== false
    };
}

function leggi() {
    try {
        return normalizza(_leggiConfigurazione());
    } catch (e) {
        return { ...PREDEFINITI };
    }
}

function coreAutoCheckAttivo() {
    try {
        return leggi().updates_core_auto_check === true;
    } catch (e) {
        return true;
    }
}

function coreInstallazioneAutomatica() {
    try {
        return leggi().updates_core_mode !== 'manual';
    } catch (e) {
        return true;
    }
}

function coreIntervalloMs() {
    try {
        return leggi().updates_core_check_hours * ORE;
    } catch (e) {
        return PREDEFINITI.updates_core_check_hours * ORE;
    }
}

function appsAutoCheckAttivo() {
    try {
        return leggi().updates_apps_auto_check === true;
    } catch (e) {
        return true;
    }
}

function appsInstallazioneAutomatica() {
    try {
        return leggi().updates_apps_mode !== 'manual';
    } catch (e) {
        return true;
    }
}

function appsIntervalloMs() {
    try {
        return leggi().updates_apps_check_hours * ORE;
    } catch (e) {
        return PREDEFINITI.updates_apps_check_hours * ORE;
    }
}

function pulisciCacheDopoAggiornamento() {
    try {
        return leggi().auto_clear_cache_on_update === true;
    } catch (e) {
        return true;
    }
}

function notificaCambiamento() {
    try {
        bus.publish('updates:policy-changed', leggi());
        return true;
    } catch (e) {
        return false;
    }
}

function osservaCambiamenti(callback) {
    try {
        if (typeof callback !== 'function') return false;
        bus.subscribe('updates:policy-changed', callback);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    ORE,
    INTERVALLI_AMMESSI,
    PREDEFINITI,
    normalizza,
    leggi,
    coreAutoCheckAttivo,
    coreInstallazioneAutomatica,
    coreIntervalloMs,
    appsAutoCheckAttivo,
    appsInstallazioneAutomatica,
    appsIntervalloMs,
    pulisciCacheDopoAggiornamento,
    notificaCambiamento,
    osservaCambiamenti
};
