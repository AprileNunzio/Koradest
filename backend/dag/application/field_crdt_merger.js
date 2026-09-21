'use strict';

function mergeFieldDeltas(existingRow, incomingPayload, incomingCreatedAt, existingCreatedAt, pkCols = ['id']) {
    try {
        if (!existingRow) {
            return {
                mergedRecord: { ...incomingPayload },
                changedFields: Object.keys(incomingPayload || {})
            };
        }

        const pkSet = new Set(pkCols);
        const merged = { ...existingRow };
        const changedFields = [];
        
        const hlc = require('./hlc');
        const incomingIsString = typeof incomingCreatedAt === 'string';
        const existingIsString = typeof existingCreatedAt === 'string';
        
        let isIncomingNewer = false;
        
        if (incomingIsString && existingIsString && incomingCreatedAt.includes('Z-')) {
            isIncomingNewer = hlc.compare(incomingCreatedAt, existingCreatedAt) >= 0;
            hlc.update(incomingCreatedAt);
        } else {
            isIncomingNewer = (incomingCreatedAt || 0) >= (existingCreatedAt || 0);
        }

        const JsonCRDT = require('./json_crdt');

        for (const [key, val] of Object.entries(incomingPayload || {})) {
            if (pkSet.has(key)) continue;

            const existingVal = existingRow[key];

            if (typeof existingVal === 'string' && (existingVal.startsWith('{') || existingVal.startsWith('['))) {
                try {
                    const parsedExisting = JSON.parse(existingVal);
                    const parsedIncoming = typeof val === 'string' ? JSON.parse(val) : val;
                    const mergedJson = JsonCRDT.mergeJsonValue(parsedExisting, parsedIncoming, existingCreatedAt || 0, incomingCreatedAt || 0);
                    const serializedMerged = JSON.stringify(mergedJson);
                    if (existingVal !== serializedMerged) {
                        merged[key] = serializedMerged;
                        changedFields.push(key);
                    }
                    continue;
                } catch (e) {
                }
            } else if (typeof existingVal === 'object' && existingVal !== null) {
                const mergedJson = JsonCRDT.mergeJsonValue(existingVal, val, existingCreatedAt || 0, incomingCreatedAt || 0);
                merged[key] = mergedJson;
                changedFields.push(key);
                continue;
            }

            if (isIncomingNewer) {
                if (existingVal !== val) {
                    merged[key] = val;
                    changedFields.push(key);
                }
            } else {
                if (existingVal === undefined || existingVal === null) {
                    merged[key] = val;
                    changedFields.push(key);
                }
            }
        }

        if (changedFields.length > 0) {
            merged.last_modified = Math.max(incomingCreatedAt || 0, existingCreatedAt || 0);
        }

        return { mergedRecord: merged, changedFields };
    } catch (_) {
        return { mergedRecord: incomingPayload || {}, changedFields: Object.keys(incomingPayload || {}) };
    }
}

module.exports = {
    mergeFieldDeltas
};
