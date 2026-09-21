'use strict';

class JsonCRDT {
    static mergeJsonValue(existingVal, incomingVal, existingTimestamp, incomingTimestamp) {
        if (typeof existingVal !== 'object' || existingVal === null || typeof incomingVal !== 'object' || incomingVal === null) {
            
            return incomingTimestamp >= existingTimestamp ? incomingVal : existingVal;
        }

        if (Array.isArray(existingVal) && Array.isArray(incomingVal)) {
            return JsonCRDT._mergeArrays(existingVal, incomingVal);
        }

        if (!Array.isArray(existingVal) && !Array.isArray(incomingVal)) {
            return JsonCRDT._mergeObjects(existingVal, incomingVal, existingTimestamp, incomingTimestamp);
        }

        
        return incomingTimestamp >= existingTimestamp ? incomingVal : existingVal;
    }

    static _mergeArrays(existingArr, incomingArr) {
        
        
        
        
        const mergedSet = new Set(existingArr.map(e => JSON.stringify(e)));
        for (const item of incomingArr) {
            mergedSet.add(JSON.stringify(item));
        }
        return Array.from(mergedSet).map(str => JSON.parse(str));
    }

    static _mergeObjects(existingObj, incomingObj, existingTimestamp, incomingTimestamp) {
        
        const merged = { ...existingObj };
        for (const [key, val] of Object.entries(incomingObj)) {
            if (merged[key] === undefined) {
                merged[key] = val;
            } else {
                merged[key] = JsonCRDT.mergeJsonValue(merged[key], val, existingTimestamp, incomingTimestamp);
            }
        }
        return merged;
    }
}

module.exports = JsonCRDT;
