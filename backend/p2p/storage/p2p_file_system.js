'use strict';

const path = require('path');
const dbManager = require('../../db/db_manager');
const fileChunker = require('./fileChunker');
const ftp = require('./fileTransferProtocol');
const { getDetailedPeers } = require('../peers/peer_registry');

class P2PFileSystem {
    constructor() {
        this.chunkStorageDir = '';
        this.downloadsDir = '';
    }

    _ensurePaths() {
        if (!this.chunkStorageDir) {
            dbManager.initPaths();
            this.chunkStorageDir = path.join(dbManager.basePath, 'p2p_chunks');
            this.downloadsDir = path.join(dbManager.basePath, 'p2p_downloads');
        }
    }

    start() {
        this._ensurePaths();
        ftp.startServer(this.chunkStorageDir);
    }

    stop() {
        ftp.stopServer();
    }

    async salvaAllegato(percorsoLocale) {
        this._ensurePaths();
        const manifest = await fileChunker.splitFile(percorsoLocale, this.chunkStorageDir);
        
        
        const fs = require('fs');
        const erasureCoder = require('./erasure_coder');
        
        const dataBuffers = manifest.chunks.map(c => fs.readFileSync(path.join(this.chunkStorageDir, `${c.hash}.chk`)));
        const shards = erasureCoder.encodeFile(dataBuffers);
        
        
        for (const shard of shards) {
            if (shard.type === 'parity') {
                const pPath = path.join(this.chunkStorageDir, `${shard.hash}.chk`);
                fs.writeFileSync(pPath, shard.buffer);
                manifest.chunks.push({ index: shard.index, hash: shard.hash, size: shard.buffer.length, type: 'parity' });
            }
        }
        
        return manifest; 
    }

    async leggiAllegato(manifest) {
        this._ensurePaths();
        const outputPath = path.join(this.downloadsDir, manifest.fileHash, manifest.fileName);
        
        try {
            
            await fileChunker.reassembleFile(manifest, this.chunkStorageDir, outputPath);
            return outputPath;
        } catch (localErr) {
            
            await this._fetchMissingChunks(manifest);
            await fileChunker.reassembleFile(manifest, this.chunkStorageDir, outputPath);
            return outputPath;
        }
    }

    async _fetchMissingChunks(manifest) {
        const peers = getDetailedPeers().filter(p => p.status === 'Online');
        if (peers.length === 0) throw new Error('Nessun peer online per scaricare il file');

        const fs = require('fs');
        for (const chunk of manifest.chunks) {
            const chunkPath = path.join(this.chunkStorageDir, `${chunk.hash}.chk`);
            if (fs.existsSync(chunkPath)) continue;

            let downloaded = false;
            for (const peer of peers) {
                try {
                    
                    
                    const token = 'trusted_mesh_token'; 
                    await ftp.downloadChunk(peer.ip, chunk.hash, this.chunkStorageDir, token);
                    downloaded = true;
                    break;
                } catch (e) {
                    continue; 
                }
            }
            if (!downloaded) {
                throw new Error(`Impossibile reperire il blocco ${chunk.hash} da nessun peer.`);
            }
        }
    }
}

module.exports = new P2PFileSystem();
