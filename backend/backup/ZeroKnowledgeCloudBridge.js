'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ZeroKnowledgeCloudBridge {
    constructor(options = {}) {
        try {
            this.algorithm = 'aes-256-gcm';
            this.keyDerivationIterations = options.iterations || 100000;
            this.storageAdapter = options.storageAdapter || this.createLocalStorageAdapter(options.localDir);
        } catch (e) {
            this.algorithm = 'aes-256-gcm';
            this.keyDerivationIterations = 100000;
            this.storageAdapter = null;
        }
    }

    setStorageAdapter(adapter) {
        try {
            if (adapter && typeof adapter.upload === 'function') {
                this.storageAdapter = adapter;
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    deriveKey(passphrase, salt) {
        try {
            if (!passphrase) throw new Error('Passphrase is required');
            const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'hex') : (salt || crypto.randomBytes(16));
            const key = crypto.pbkdf2Sync(passphrase, saltBuffer, this.keyDerivationIterations, 32, 'sha256');
            return { key, salt: saltBuffer.toString('hex') };
        } catch (e) {
            throw new Error(`Key derivation failed: ${e.message}`);
        }
    }

    encryptPayload(data, passphrase) {
        try {
            if (!data) throw new Error('No data provided');
            const saltBuffer = crypto.randomBytes(16);
            const { key } = this.deriveKey(passphrase, saltBuffer);
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);

            const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8');
            const encrypted = Buffer.concat([cipher.update(bufferData), cipher.final()]);
            const authTag = cipher.getAuthTag();

            const envelope = {
                v: 1,
                alg: this.algorithm,
                salt: saltBuffer.toString('hex'),
                iv: iv.toString('hex'),
                tag: authTag.toString('hex'),
                payload: encrypted.toString('base64'),
                checksum: crypto.createHash('sha256').update(bufferData).digest('hex'),
                timestamp: Date.now()
            };

            return { success: true, envelope: JSON.stringify(envelope) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    decryptPayload(envelopeStr, passphrase) {
        try {
            if (!envelopeStr || !passphrase) throw new Error('Envelope and passphrase required');
            const envelope = typeof envelopeStr === 'string' ? JSON.parse(envelopeStr) : envelopeStr;
            const saltBuffer = Buffer.from(envelope.salt, 'hex');
            const { key } = this.deriveKey(passphrase, saltBuffer);
            const iv = Buffer.from(envelope.iv, 'hex');
            const tag = Buffer.from(envelope.tag, 'hex');
            const encryptedText = Buffer.from(envelope.payload, 'base64');

            const decipher = crypto.createDecipheriv(envelope.alg || this.algorithm, key, iv);
            decipher.setAuthTag(tag);

            const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
            const calculatedChecksum = crypto.createHash('sha256').update(decrypted).digest('hex');

            if (envelope.checksum && calculatedChecksum !== envelope.checksum) {
                throw new Error('Integrity checksum verification failed');
            }

            return { success: true, data: decrypted.toString('utf8'), checksum: calculatedChecksum };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async backupEncryptedFile(backupName, data, passphrase, retentionDays = 30) {
        try {
            if (!this.storageAdapter) throw new Error('No storage adapter configured');
            const encrypted = this.encryptPayload(data, passphrase);
            if (!encrypted.success) return encrypted;

            const metadata = {
                backupName,
                wormProtectedUntil: Date.now() + (retentionDays * 24 * 60 * 60 * 1000),
                createdAt: Date.now()
            };

            const remotePath = `backups/${backupName}_${Date.now()}.zkenc`;
            const uploadResult = await this.storageAdapter.upload(remotePath, encrypted.envelope, metadata);

            return {
                success: true,
                remotePath,
                metadata,
                uploadResult
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async restoreEncryptedFile(remotePath, passphrase) {
        try {
            if (!this.storageAdapter) throw new Error('No storage adapter configured');
            const rawEnvelope = await this.storageAdapter.download(remotePath);
            if (!rawEnvelope) throw new Error('Failed to retrieve backup from storage adapter');

            return this.decryptPayload(rawEnvelope, passphrase);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    createLocalStorageAdapter(storageDir) {
        try {
            const dir = storageDir || path.join(process.cwd(), 'zk_cloud_vault');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            return {
                async upload(remotePath, content, metadata = {}) {
                    try {
                        const target = path.join(dir, path.basename(remotePath));
                        const metaTarget = `${target}.meta`;
                        fs.writeFileSync(target, content, 'utf8');
                        fs.writeFileSync(metaTarget, JSON.stringify(metadata, null, 2), 'utf8');
                        return { success: true, localPath: target };
                    } catch (e) {
                        return { success: false, error: e.message };
                    }
                },
                async download(remotePath) {
                    try {
                        const target = path.join(dir, path.basename(remotePath));
                        if (!fs.existsSync(target)) return null;
                        return fs.readFileSync(target, 'utf8');
                    } catch (e) {
                        return null;
                    }
                },
                async list() {
                    try {
                        if (!fs.existsSync(dir)) return [];
                        return fs.readdirSync(dir).filter(f => f.endsWith('.zkenc'));
                    } catch (e) {
                        return [];
                    }
                },
                async delete(remotePath) {
                    try {
                        const target = path.join(dir, path.basename(remotePath));
                        const metaTarget = `${target}.meta`;
                        if (fs.existsSync(metaTarget)) {
                            const meta = JSON.parse(fs.readFileSync(metaTarget, 'utf8'));
                            if (meta.wormProtectedUntil && Date.now() < meta.wormProtectedUntil) {
                                return { success: false, error: 'WORM retention lock active. File cannot be deleted.' };
                            }
                        }
                        if (fs.existsSync(target)) fs.unlinkSync(target);
                        if (fs.existsSync(metaTarget)) fs.unlinkSync(metaTarget);
                        return { success: true };
                    } catch (e) {
                        return { success: false, error: e.message };
                    }
                }
            };
        } catch (e) {
            return null;
        }
    }
}

module.exports = ZeroKnowledgeCloudBridge;
