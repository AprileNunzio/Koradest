'use strict';

const eraser = require('./gdpr/subject_eraser');
const planner = require('./gdpr/erasure_planner');
const shredder = require('../dag/security/payload_shredder');

const GIORNI_CONSERVAZIONE_PREDEFINITI = 365 * 5;

class GdprManager {
    constructor() {
        this._retentionDays = GIORNI_CONSERVAZIONE_PREDEFINITI;
    }

    setRetentionDays(giorni) {
        if (Number.isInteger(giorni) && giorni > 0) this._retentionDays = giorni;
        return this._retentionDays;
    }

    getRetentionDays() {
        return this._retentionDays;
    }

    async eraseSubjectData(personaId, attore) {
        return await eraser.eraseSubject(personaId, attore);
    }

    exportSubjectData(personaId) {
        return eraser.exportSubject(personaId);
    }

    previewErasure(personaId) {
        const piano = planner.pianificaCancellazione(personaId);
        const perTabella = {};
        for (const bersaglio of piano.bersagli) {
            perTabella[bersaglio.table] = (perTabella[bersaglio.table] || 0) + 1;
        }
        return {
            success: true,
            soggetto: personaId,
            utenteCollegato: piano.utenteCollegato || null,
            totaleRighe: piano.bersagli.length,
            perTabella,
            blocchiNelRegistro: shredder.residuiPerBersaglio(piano.bersagli.map(b => ({ table: b.table, recordId: b.recordId })))
        };
    }

    ledgerStats() {
        return { success: true, registro: shredder.shredStats() };
    }

    getRetentionPolicy() {
        const runner = require('./gdpr/retention_runner');
        return { success: true, policy: runner.getPolicy(), anteprima: runner.anteprima().dettagli || [] };
    }

    async setRetentionPolicy(input, attore) {
        const runner = require('./gdpr/retention_runner');
        return { success: true, policy: await runner.setPolicy(input, attore) };
    }

    async runRetention() {
        return await require('./gdpr/retention_runner').esegui({ forzato: true });
    }

    privacyRegister() {
        return require('./gdpr/privacy_register').generaRegistro();
    }

    privacyRegisterMarkdown() {
        const registro = require('./gdpr/privacy_register');
        return registro.comeMarkdown(registro.generaRegistro());
    }
}

module.exports = new GdprManager();
