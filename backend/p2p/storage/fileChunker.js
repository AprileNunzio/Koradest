'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbCrypto = require('../../db/db_crypto');
const dbManager = require('../../db/db_manager');

class FileChunker {
    constructor() {
        this.chunkSize = 512 * 1024; // 512KB per chunk
    }

    _getEncryptionKey() {
        const keyHex = dbManager.deviceKey;
        if (!keyHex) throw new Error('DeviceKey mancante. Impossibile eseguire operazioni crittografiche sui file.');
        return keyHex;
    }

    _encryptChunk(buffer) {
        const keyHex = this._getEncryptionKey();
        return dbCrypto.encryptBuffer(buffer, keyHex);
    }

    _decryptChunk(encryptedBuffer) {
        const keyHex = this._getEncryptionKey();
        return dbCrypto.decryptBuffer(encryptedBuffer, keyHex);
    }

    async splitFile(filePath, outputDir) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File non trovato: ${filePath}`);
        }
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const totalHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const chunks = [];
        let offset = 0;

        while (offset < fileBuffer.length) {
            const chunk = fileBuffer.slice(offset, offset + this.chunkSize);
            const chunkHash = crypto.createHash('sha256').update(chunk).digest('hex');
            const chunkPath = path.join(outputDir, `${chunkHash}.chk`);

            if (!fs.existsSync(chunkPath)) {
                const encryptedChunk = this._encryptChunk(chunk);
                fs.writeFileSync(chunkPath, encryptedChunk);
            }

            chunks.push({
                index: chunks.length,
                hash: chunkHash,
                size: chunk.length
            });
            offset += this.chunkSize;
        }

        return {
            fileHash: totalHash,
            fileName: path.basename(filePath),
            totalSize: fileBuffer.length,
            chunkCount: chunks.length,
            chunks: chunks
        };
    }

    async reassembleFile(manifest, chunksDir, outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writeStream = fs.createWriteStream(outputPath);

        try {
            for (const chunkInfo of manifest.chunks) {
                const chunkPath = path.join(chunksDir, `${chunkInfo.hash}.chk`);
                if (!fs.existsSync(chunkPath)) {
                    throw new Error(`Blocco mancante per il riassemblaggio: ${chunkInfo.hash}`);
                }

                const encryptedData = fs.readFileSync(chunkPath);
                const decryptedData = this._decryptChunk(encryptedData);
                const checkHash = crypto.createHash('sha256').update(decryptedData).digest('hex');
                
                if (checkHash !== chunkInfo.hash) {
                    throw new Error(`Corruzione blocco rilevata durante l'hashing: ${chunkInfo.hash}`);
                }
                writeStream.write(decryptedData);
            }
        } finally {
            writeStream.end();
        }
        return true;
    }
}

module.exports = new FileChunker();
