'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const sessionCrypto = require('../protocol/session_crypto');

class FileTransferProtocol {
    constructor() {
        this.server = null;
        this.port = 45891;
        this.storageDir = '';
        this.transferTokens = new Map();
    }

    generateTokenForPeer(peerAddress) {
        const token = sessionCrypto.generateToken();
        this.transferTokens.set(token, { peer: peerAddress, expires: Date.now() + 60000 });
        return token;
    }

    _validateToken(token, peerIp) {
        const entry = this.transferTokens.get(token);
        if (!entry) return false;
        if (entry.expires < Date.now()) {
            this.transferTokens.delete(token);
            return false;
        }
        return true; 
    }

    startServer(storageDir) {
        this.storageDir = storageDir;
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }

        this.server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('t');
            const clientIp = req.socket.remoteAddress.replace(/^.*:/, '');

            if (!this._validateToken(token, clientIp)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Token non valido o scaduto' }));
            }

            if (req.method === 'GET' && url.pathname.startsWith('/chunk/')) {
                const chunkHash = url.pathname.replace('/chunk/', '').replace(/[^a-f0-9]/gi, '');
                const chunkPath = path.join(this.storageDir, `${chunkHash}.chk`);

                if (fs.existsSync(chunkPath)) {
                    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                    fs.createReadStream(chunkPath).pipe(res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Chunk non trovato' }));
                }
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Richiesta non valida' }));
            }
        });

        this.server.listen(this.port);
    }

    downloadChunk(peerAddress, chunkHash, targetDir, authToken) {
        return new Promise((resolve, reject) => {
            const chunkPath = path.join(targetDir, `${chunkHash}.chk`);
            if (fs.existsSync(chunkPath)) {
                return resolve(chunkPath);
            }

            const url = `http://${peerAddress}:${this.port}/chunk/${chunkHash}?t=${authToken}`;
            const file = fs.createWriteStream(chunkPath);

            const request = http.get(url, (response) => {
                if (response.statusCode !== 200) {
                    fs.unlinkSync(chunkPath);
                    return reject(new Error(`Errore HTTP ${response.statusCode}`));
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(chunkPath));
                });
            });

            request.on('error', (err) => {
                if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
                reject(err);
            });
        });
    }

    stopServer() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}

module.exports = new FileTransferProtocol();
