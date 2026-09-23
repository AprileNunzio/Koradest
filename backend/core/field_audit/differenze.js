'use strict';

const CAMPO_RECORD = '*';
const CAMPI_TECNICI = new Set(['id', 'created_at', 'updated_at']);

function uguali(a, b) {
    if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) return a.equals(b);
    return a === b || (a === null && b === undefined) || (a === undefined && b === null);
}

function serializza(valore) {
    if (valore === null || valore === undefined) return null;
    if (Buffer.isBuffer(valore)) return JSON.stringify({ blob: valore.length });
    return JSON.stringify(valore);
}

function vociDi(cambio) {
    if (cambio.azione === 'DELETE') {
        return [{ campo: CAMPO_RECORD, prima: serializza(cambio.prima), dopo: null }];
    }
    const prima = cambio.prima || {};
    const dopo = cambio.dopo || {};
    return Object.keys(dopo)
        .filter(campo => !CAMPI_TECNICI.has(campo))
        .filter(campo => (cambio.azione === 'INSERT' ? dopo[campo] !== null : !uguali(prima[campo], dopo[campo])))
        .map(campo => ({ campo, prima: serializza(prima[campo]), dopo: serializza(dopo[campo]) }));
}

module.exports = { vociDi, CAMPO_RECORD };
