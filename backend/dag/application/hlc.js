'use strict';

class HybridLogicalClock {
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.wallTime = Date.now();
        this.logical = 0;
    }

    now() {
        const physical = Date.now();
        if (physical > this.wallTime) {
            this.wallTime = physical;
            this.logical = 0;
        } else {
            this.logical++;
        }
        return this.toString();
    }

    update(remoteHlcString) {
        const remote = HybridLogicalClock.parse(remoteHlcString);
        const physical = Date.now();

        this.wallTime = Math.max(this.wallTime, remote.wallTime, physical);

        if (this.wallTime === this.wallTime && this.wallTime === remote.wallTime) {
            this.logical = Math.max(this.logical, remote.logical) + 1;
        } else if (this.wallTime === remote.wallTime) {
            this.logical = remote.logical + 1;
        } else if (this.wallTime === this.wallTime) { 
            this.logical = this.logical + 1;
        } else {
            this.logical = 0;
        }

        return this.toString();
    }

    toString() {
        const timeStr = new Date(this.wallTime).toISOString();
        const logicalStr = this.logical.toString(16).padStart(4, '0');
        return `${timeStr}-${logicalStr}-${this.nodeId}`;
    }

    static parse(hlcString) {
        try {
            const parts = hlcString.split('-');
            
            const timeStr = parts.slice(0, 3).join('-') + '-' + parts[3].split('-')[0]; 
            
            
            const match = hlcString.match(/^(.+Z)-([0-9a-fA-F]{4})-(.+)$/);
            if (!match) throw new Error('Invalid HLC format');

            return {
                wallTime: new Date(match[1]).getTime(),
                logical: parseInt(match[2], 16),
                nodeId: match[3]
            };
        } catch (e) {
            return { wallTime: 0, logical: 0, nodeId: 'unknown' };
        }
    }

    static compare(hlcA, hlcB) {
        const a = HybridLogicalClock.parse(hlcA);
        const b = HybridLogicalClock.parse(hlcB);

        if (a.wallTime !== b.wallTime) {
            return a.wallTime - b.wallTime;
        }
        if (a.logical !== b.logical) {
            return a.logical - b.logical;
        }
        return a.nodeId.localeCompare(b.nodeId);
    }
}


let instance = null;

function getHLC() {
    if (!instance) {
        const identity = require('../../core/node_identity');
        instance = new HybridLogicalClock(identity.getNodeId());
    }
    return instance;
}

module.exports = {
    HybridLogicalClock,
    getHLC,
    now: () => getHLC().now(),
    update: (remote) => getHLC().update(remote),
    compare: HybridLogicalClock.compare
};
