'use strict';

const http = require('http');
const dbManager = require('../../db/db_manager');
const pkiCa = require('../../security/pki_ca');

class MeshBridge {
    constructor() {
        this.authorizedExternalPeers = new Map(); 
    }

    authorizeExternalSchool(token, targetSchoolName) {
        if (!pkiCa.isRootCA()) throw new Error('Solo la CA puo autorizzare bridge B2B.');
        this.authorizedExternalPeers.set(token, targetSchoolName);
    }

    
    extractSubGraph(studentId) {
        const db = dbManager.getDB('ledger');
        
        const blocks = db.query("SELECT * FROM event_log WHERE record_id = ? AND table_name = 'alunni'", [String(studentId)]);
        return blocks;
    }

    
    async pushToExternalMesh(externalIp, externalPort, token, studentId) {
        const subgraph = this.extractSubGraph(studentId);
        if (subgraph.length === 0) throw new Error('Nessun dato trovato per il sub-grafo.');

        return new Promise((resolve, reject) => {
            const payloadStr = JSON.stringify({
                auth_token: token,
                subgraph: subgraph
            });

            const req = http.request({
                hostname: externalIp,
                port: externalPort,
                path: '/bridge/receive',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payloadStr)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) resolve(JSON.parse(data));
                    else reject(new Error('Bridge Error: ' + res.statusCode));
                });
            });

            req.on('error', reject);
            req.write(payloadStr);
            req.end();
        });
    }

    
    handleIncomingBridgeRequest(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const schoolName = this.authorizedExternalPeers.get(data.auth_token);
                
                if (!schoolName) {
                    res.writeHead(403);
                    return res.end(JSON.stringify({ error: 'Bridge Token non valido' }));
                }

                
                const blockFactory = require('../../dag/block/block_factory');
                for (const b of data.subgraph) {
                    
                    blockFactory.createBlock('BRIDGE_IMPORT', b.table_name, b.record_id, b.payload);
                }

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, imported: data.subgraph.length }));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    }
}

module.exports = new MeshBridge();
