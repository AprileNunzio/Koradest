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

        const isIncomingNewer = (incomingCreatedAt || 0) >= (existingCreatedAt || 0);

        for (const [key, val] of Object.entries(incomingPayload || {})) {
            if (pkSet.has(key)) continue;

            if (isIncomingNewer) {
                if (existingRow[key] !== val) {
                    merged[key] = val;
                    changedFields.push(key);
                }
            } else {
                if (existingRow[key] === undefined || existingRow[key] === null) {
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
