'use strict';

const crypto = require('crypto');

class ErasureCoder {
    constructor() {
        this.chunkSize = 512 * 1024; 
    }

    
    
    encodeFile(chunksBufferArray) {
        if (!chunksBufferArray || chunksBufferArray.length === 0) return [];
        
        let maxLength = 0;
        chunksBufferArray.forEach(buf => { if (buf.length > maxLength) maxLength = buf.length; });

        
        const parityBuffer = Buffer.alloc(maxLength);
        for (let i = 0; i < chunksBufferArray.length; i++) {
            const chunk = chunksBufferArray[i];
            for (let j = 0; j < chunk.length; j++) {
                parityBuffer[j] ^= chunk[j];
            }
        }

        const encodedShards = chunksBufferArray.map((buf, i) => ({
            type: 'data',
            index: i,
            buffer: buf,
            hash: crypto.createHash('sha256').update(buf).digest('hex')
        }));

        encodedShards.push({
            type: 'parity',
            index: chunksBufferArray.length,
            buffer: parityBuffer,
            hash: crypto.createHash('sha256').update(parityBuffer).digest('hex')
        });

        return encodedShards;
    }

    
    healMissingShard(availableShardsBufferArray, targetSize) {
        if (!availableShardsBufferArray || availableShardsBufferArray.length === 0) return null;
        
        const healedBuffer = Buffer.alloc(targetSize);
        for (let i = 0; i < availableShardsBufferArray.length; i++) {
            const shard = availableShardsBufferArray[i];
            for (let j = 0; j < shard.length; j++) {
                healedBuffer[j] ^= shard[j];
            }
        }
        return healedBuffer;
    }
}

module.exports = new ErasureCoder();
