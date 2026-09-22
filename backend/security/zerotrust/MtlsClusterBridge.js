'use strict';

const tls = require('tls');
const crypto = require('crypto');

class MtlsClusterBridge {
    static createServerConfig({ key, cert, ca, verifyNodeIdFn }) {
        try {
            if (!key || !cert || !ca) {
                throw new Error('Chiave privata, certificato e CA obbligatori per mTLS');
            }

            return {
                key,
                cert,
                ca: [ca],
                requestCert: true,
                rejectUnauthorized: true,
                minVersion: 'TLSv1.3',
                checkServerIdentity: (host, clientCert) => {
                    try {
                        if (typeof verifyNodeIdFn === 'function') {
                            const valid = verifyNodeIdFn(clientCert);
                            if (!valid) {
                                return new Error('Certificato client non autorizzato per il cluster');
                            }
                        }
                        return undefined;
                    } catch (e) {
                        return new Error(e.message);
                    }
                }
            };
        } catch (e) {
            throw e;
        }
    }

    static createClientConfig({ key, cert, ca, expectedNodeId }) {
        try {
            if (!key || !cert || !ca) {
                throw new Error('Chiave privata, certificato e CA obbligatori per mTLS client');
            }

            return {
                key,
                cert,
                ca: [ca],
                rejectUnauthorized: true,
                minVersion: 'TLSv1.3',
                checkServerIdentity: (host, serverCert) => {
                    try {
                        if (expectedNodeId && serverCert && serverCert.subject) {
                            const cn = serverCert.subject.CN;
                            if (cn !== expectedNodeId) {
                                return new Error(`Node ID atteso: ${expectedNodeId}, ricevuto: ${cn}`);
                            }
                        }
                        return undefined;
                    } catch (e) {
                        return new Error(e.message);
                    }
                }
            };
        } catch (e) {
            throw e;
        }
    }

    static validatePeerCertificate(cert, expectedCaFingerprint) {
        try {
            if (!cert || !cert.fingerprint256) {
                return false;
            }
            if (expectedCaFingerprint && cert.issuerCertificate) {
                return cert.issuerCertificate.fingerprint256 === expectedCaFingerprint;
            }
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = MtlsClusterBridge;
