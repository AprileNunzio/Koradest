'use strict';

class InterestManifest {
    constructor() {
        this.interests = new Set();
        
        
    }

    subscribe(domain) {
        this.interests.add(domain);
    }

    unsubscribe(domain) {
        this.interests.delete(domain);
    }

    isInterestedIn(domain) {
        
        if (this.interests.size === 0) return true;
        return this.interests.has(domain);
    }

    exportManifest() {
        return Array.from(this.interests);
    }

    filterBlocksForPeer(peerInterestsArray, blocksArray) {
        if (!peerInterestsArray || peerInterestsArray.length === 0) return blocksArray;
        const interestSet = new Set(peerInterestsArray);
        return blocksArray.filter(block => {
            
            const domain = block.table_name; 
            return interestSet.has(domain);
        });
    }
}

module.exports = new InterestManifest();
