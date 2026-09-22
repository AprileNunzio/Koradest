'use strict';

class DomainConflictMerger {
    constructor() {
        try {
            this.customMergers = new Map();
        } catch (e) {
            this.customMergers = new Map();
        }
    }

    registerEntityMerger(entityType, mergeFn) {
        try {
            if (!entityType || typeof mergeFn !== 'function') return false;
            this.customMergers.set(entityType, mergeFn);
            return true;
        } catch (e) {
            return false;
        }
    }

    merge(entityType, { base = {}, local = {}, remote = {} } = {}, strategy = 'FIELD_LEVEL_MERGE') {
        try {
            if (this.customMergers.has(entityType)) {
                const customFn = this.customMergers.get(entityType);
                const customResult = customFn({ base, local, remote });
                if (customResult && typeof customResult === 'object') {
                    return { success: true, strategy: 'CUSTOM', merged: customResult, hasConflicts: false };
                }
            }

            if (strategy === 'LWW') {
                const localTs = local.updated_at || local.last_modified || 0;
                const remoteTs = remote.updated_at || remote.last_modified || 0;
                const chosen = remoteTs > localTs ? remote : local;
                return { success: true, strategy: 'LWW', merged: Object.assign({}, base, chosen), hasConflicts: false };
            }

            const allKeys = Array.from(new Set([
                ...Object.keys(base || {}),
                ...Object.keys(local || {}),
                ...Object.keys(remote || {})
            ]));

            const merged = {};
            const conflicts = [];

            for (const key of allKeys) {
                const bVal = base ? base[key] : undefined;
                const lVal = local ? local[key] : undefined;
                const rVal = remote ? remote[key] : undefined;

                if (JSON.stringify(lVal) === JSON.stringify(rVal)) {
                    merged[key] = lVal;
                    continue;
                }

                if (JSON.stringify(lVal) === JSON.stringify(bVal)) {
                    merged[key] = rVal;
                    continue;
                }

                if (JSON.stringify(rVal) === JSON.stringify(bVal)) {
                    merged[key] = lVal;
                    continue;
                }

                if (Array.isArray(lVal) && Array.isArray(rVal)) {
                    merged[key] = Array.from(new Set([...lVal, ...rVal]));
                    continue;
                }

                if (key === 'updated_at' || key === 'last_modified') {
                    merged[key] = Math.max(Number(lVal) || 0, Number(rVal) || 0);
                    continue;
                }

                conflicts.push({ key, base: bVal, local: lVal, remote: rVal });
                const localTs = local.updated_at || local.last_modified || 0;
                const remoteTs = remote.updated_at || remote.last_modified || 0;
                merged[key] = remoteTs >= localTs ? rVal : lVal;
            }

            return {
                success: true,
                strategy: 'FIELD_LEVEL_MERGE',
                merged,
                hasConflicts: conflicts.length > 0,
                conflicts
            };
        } catch (e) {
            return { success: false, error: e.message, merged: Object.assign({}, remote || local) };
        }
    }
}

module.exports = new DomainConflictMerger();
