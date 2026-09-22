'use strict';

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class Rfc3161TimestampClient {
    constructor(tsaUrl = 'https://freetsa.org/tsr') {
        try {
            this.tsaUrl = tsaUrl;
        } catch (e) {
            this.tsaUrl = 'https://freetsa.org/tsr';
        }
    }

    setTsaUrl(url) {
        try {
            if (url && typeof url === 'string') {
                this.tsaUrl = url;
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    createTimestampQuery(dataOrHash, isPrehashed = false) {
        try {
            const hashBuffer = isPrehashed
                ? (Buffer.isBuffer(dataOrHash) ? dataOrHash : Buffer.from(dataOrHash, 'hex'))
                : crypto.createHash('sha256').update(dataOrHash).digest();

            const nonce = crypto.randomBytes(8);

            const sha256OidDer = Buffer.from('300d06096086480165030402010500', 'hex');
            const messageImprint = Buffer.concat([
                Buffer.from([0x30, sha256OidDer.length + hashBuffer.length + 2]),
                sha256OidDer,
                Buffer.from([0x04, hashBuffer.length]),
                hashBuffer
            ]);

            const nonceDer = Buffer.concat([
                Buffer.from([0x02, nonce.length]),
                nonce
            ]);

            const certReqDer = Buffer.from([0x01, 0x01, 0xff]);

            const body = Buffer.concat([
                Buffer.from([0x02, 0x01, 0x01]),
                messageImprint,
                nonceDer,
                certReqDer
            ]);

            const tsRequest = Buffer.concat([
                Buffer.from([0x30, body.length]),
                body
            ]);

            return {
                requestBuffer: tsRequest,
                hashHex: hashBuffer.toString('hex'),
                nonceHex: nonce.toString('hex')
            };
        } catch (e) {
            return {
                requestBuffer: null,
                error: e.message
            };
        }
    }

    async requestRemoteTimestamp(dataOrHash, isPrehashed = false, timeoutMs = 8000) {
        try {
            const query = this.createTimestampQuery(dataOrHash, isPrehashed);
            if (!query.requestBuffer) throw new Error(query.error || 'Failed to create TS query');

            const parsedUrl = new URL(this.tsaUrl);
            const transport = parsedUrl.protocol === 'https:' ? https : http;

            return new Promise((resolve) => {
                try {
                    const req = transport.request(parsedUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/timestamp-query',
                            'Content-Length': query.requestBuffer.length
                        },
                        timeout: timeoutMs
                    }, (res) => {
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => {
                            try {
                                if (res.statusCode !== 200) {
                                    resolve({ success: false, error: `TSA returned HTTP ${res.statusCode}` });
                                    return;
                                }
                                const responseBuffer = Buffer.concat(chunks);
                                resolve({
                                    success: true,
                                    tsaUrl: this.tsaUrl,
                                    hashHex: query.hashHex,
                                    tokenBase64: responseBuffer.toString('base64'),
                                    timestamp: Date.now()
                                });
                            } catch (err) {
                                resolve({ success: false, error: err.message });
                            }
                        });
                    });

                    req.on('error', (err) => {
                        resolve({ success: false, error: err.message });
                    });

                    req.on('timeout', () => {
                        req.destroy();
                        resolve({ success: false, error: 'TSA request timed out' });
                    });

                    req.write(query.requestBuffer);
                    req.end();
                } catch (err) {
                    resolve({ success: false, error: err.message });
                }
            });
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    createLocalDeterministicToken(dataOrHash, privateKeyPem, isPrehashed = false) {
        try {
            const hashBuffer = isPrehashed
                ? (Buffer.isBuffer(dataOrHash) ? dataOrHash : Buffer.from(dataOrHash, 'hex'))
                : crypto.createHash('sha256').update(dataOrHash).digest();

            const timestamp = Date.now();
            const tokenPayload = {
                v: 1,
                standard: 'RFC-3161-LOCAL-TSA',
                hash: hashBuffer.toString('hex'),
                algorithm: 'sha256',
                timestamp,
                isoDate: new Date(timestamp).toISOString()
            };

            let signature = '';
            if (privateKeyPem) {
                const signer = crypto.createSign('SHA256');
                signer.update(JSON.stringify(tokenPayload));
                signature = signer.sign(privateKeyPem, 'base64');
            }

            return {
                success: true,
                token: tokenPayload,
                signature,
                verifiedLocally: true
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    verifyLocalToken(tokenObj, signature, publicKeyPem) {
        try {
            if (!tokenObj || !signature || !publicKeyPem) return false;
            const verifier = crypto.createVerify('SHA256');
            verifier.update(JSON.stringify(tokenObj));
            return verifier.verify(publicKeyPem, signature, 'base64');
        } catch (e) {
            return false;
        }
    }
}

module.exports = new Rfc3161TimestampClient();
