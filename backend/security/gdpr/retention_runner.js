'use strict';

const POLICY_ID = 'default';
const GIORNO_MS = 24 * 60 * 60 * 1000;
const INTERVALLO_CONTROLLO_MS = 6 * 60 * 60 * 1000;
const LIMITI = { min: 30, max: 3650 };

const REGOLE = [
    { chiave: 'access_logs_days', dominio: 'auth', tabella: 'access_logs', colonna: 'timestamp', unita: 'ms' },
    { chiave: 'notifications_days', dominio: 'auth', tabella: 'notifications', colonna: 'created_at', unita: 'ms' },
    { chiave: 'system_logs_days', dominio: 'auth', tabella: 'distributed_logs', colonna: 'created_at', unita: 'ms' },
    { chiave: 'audit_days', dominio: 'audit', tabella: 'audit_log', colonna: 'timestamp', unita: 's' }
];

let _timer = null;

function _expected(code) {
    const err = new Error(code);
    err.isExpected = true;
    return err;
}

function _db(dominio) {
    return require('../../db').getDB(dominio);
}

function getPolicy() {
    try {
        const righe = _db('auth').query('SELECT * FROM retention_policy WHERE id = ?', [POLICY_ID]);
        if (!righe || righe.length === 0) return null;
        const riga = righe[0];
        return {
            id: riga.id,
            accessLogsDays: Number(riga.access_logs_days),
            notificationsDays: Number(riga.notifications_days),
            systemLogsDays: Number(riga.system_logs_days),
            auditDays: Number(riga.audit_days),
            enabled: riga.enabled === 1,
            lastRun: Number(riga.last_run) || 0,
            updatedBy: riga.updated_by || ''
        };
    } catch (e) {
        if (e.message === 'DB_NOT_INITIALIZED') return null;
        throw e;
    }
}

function _validaGiorni(valore, chiave) {
    const numero = Number(valore);
    if (!Number.isInteger(numero) || numero < LIMITI.min || numero > LIMITI.max) {
        throw _expected('RETENTION_DAYS_INVALID:' + chiave);
    }
    return numero;
}

async function setPolicy(input, attore) {
    const { isSuperadmin } = require('../../core/access_guard');
    if (!isSuperadmin()) throw _expected('FORBIDDEN');
    const valori = {
        access_logs_days: _validaGiorni(input && input.accessLogsDays, 'accessLogsDays'),
        notifications_days: _validaGiorni(input && input.notificationsDays, 'notificationsDays'),
        system_logs_days: _validaGiorni(input && input.systemLogsDays, 'systemLogsDays'),
        audit_days: _validaGiorni(input && input.auditDays, 'auditDays'),
        enabled: input && input.enabled === false ? 0 : 1
    };
    const adesso = Date.now();
    const db = _db('auth');
    db.run(
        'UPDATE retention_policy SET access_logs_days = ?, notifications_days = ?, system_logs_days = ?, audit_days = ?, enabled = ?, updated_by = ?, last_modified = ? WHERE id = ?',
        [valori.access_logs_days, valori.notifications_days, valori.system_logs_days, valori.audit_days, valori.enabled, attore || '', adesso, POLICY_ID]
    );
    await require('../../db').saveDB('auth', true);
    require('../../db').wrapMutationWithEvent('UPDATE', 'retention_policy', POLICY_ID, {
        id: POLICY_ID, ...valori, updated_by: attore || '', last_modified: adesso, is_deleted: 0
    });
    return getPolicy();
}

function _sogliaPer(regola, giorni) {
    const limite = Date.now() - giorni * GIORNO_MS;
    return regola.unita === 's' ? Math.floor(limite / 1000) : limite;
}

function _contaScaduti(regola, soglia) {
    const righe = _db(regola.dominio).query(
        `SELECT COUNT(*) AS totale FROM ${regola.tabella} WHERE ${regola.colonna} < ?`,
        [soglia]
    );
    return righe && righe.length > 0 ? Number(righe[0].totale) || 0 : 0;
}

function anteprima() {
    const policy = getPolicy();
    if (!policy) return { success: false, error: 'Nessuna politica di conservazione disponibile.' };
    const dettagli = [];
    for (const regola of REGOLE) {
        const giorni = policy[_camel(regola.chiave)];
        const soglia = _sogliaPer(regola, giorni);
        dettagli.push({ tabella: regola.tabella, giorni, scaduti: _contaScaduti(regola, soglia) });
    }
    return { success: true, policy, dettagli };
}

function _camel(chiave) {
    return chiave.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

async function esegui({ forzato = false } = {}) {
    const policy = getPolicy();
    if (!policy) return { success: false, eseguito: false, motivo: 'Nessuna rete attiva.' };
    if (!policy.enabled && !forzato) return { success: true, eseguito: false, motivo: 'Conservazione disattivata.' };
    if (!forzato && Date.now() - policy.lastRun < GIORNO_MS) {
        return { success: true, eseguito: false, motivo: 'Gia eseguita nelle ultime 24 ore.' };
    }

    const rimossi = {};
    const dominiToccati = new Set();
    for (const regola of REGOLE) {
        const giorni = policy[_camel(regola.chiave)];
        const soglia = _sogliaPer(regola, giorni);
        try {
            const scaduti = _contaScaduti(regola, soglia);
            if (scaduti === 0) {
                rimossi[regola.tabella] = 0;
                continue;
            }
            _db(regola.dominio).run(`DELETE FROM ${regola.tabella} WHERE ${regola.colonna} < ?`, [soglia]);
            rimossi[regola.tabella] = scaduti;
            dominiToccati.add(regola.dominio);
        } catch (e) {
            console.error(`[Retention] Purga di ${regola.tabella} non riuscita:`, e.message);
            rimossi[regola.tabella] = 0;
        }
    }

    const adesso = Date.now();
    _db('auth').run('UPDATE retention_policy SET last_run = ? WHERE id = ?', [adesso, POLICY_ID]);
    dominiToccati.add('auth');
    for (const dominio of dominiToccati) await require('../../db').saveDB(dominio, true);

    const totale = Object.values(rimossi).reduce((a, b) => a + b, 0);
    if (totale > 0) {
        try {
            require('../../observability/auditLogger').logEvent('system', 'RETENTION_PURGE', 'retention_policy', POLICY_ID, rimossi, 'SUCCESS');
        } catch (_) {}
    }
    console.log(`[Retention] Purga completata: ${totale} record rimossi.`);
    return { success: true, eseguito: true, rimossi, totale, eseguitaIl: adesso };
}

function avvia() {
    if (_timer) return false;
    _timer = setInterval(() => {
        esegui().catch(e => console.error('[Retention] Esecuzione periodica non riuscita:', e.message));
    }, INTERVALLO_CONTROLLO_MS);
    if (typeof _timer.unref === 'function') _timer.unref();
    esegui().catch(e => console.error('[Retention] Prima esecuzione non riuscita:', e.message));
    return true;
}

function ferma() {
    if (!_timer) return false;
    clearInterval(_timer);
    _timer = null;
    return true;
}

module.exports = { getPolicy, setPolicy, esegui, anteprima, avvia, ferma, REGOLE, POLICY_ID, LIMITI };
