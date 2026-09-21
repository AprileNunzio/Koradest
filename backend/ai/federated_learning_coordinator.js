'use strict';

const dbManager = require('../../db/db_manager');
const hlc = require('../../dag/application/hlc');
const roleKeystore = require('../../security/role_keystore');

class FederatedLearningCoordinator {
    
    constructor() {
        this.MODEL_VERSION = 'v1.0.0';
    }

    _canComputeLocalAI() {
        
        const pkiCa = require('../../security/pki_ca');
        return pkiCa.isRootCA() || process.env.IS_AI_SERVER === 'true';
    }

    
    extractLocalMetrics() {
        if (!this._canComputeLocalAI()) return null;
        
        
        const db = dbManager.getDB('gestione_classi');
        try {
            
            const stats = db.query('SELECT AVG(voto) as avg_grade, count(*) as total_grades FROM voti');
            return {
                avgGrade: stats[0].avg_grade || 0,
                volume: stats[0].total_grades || 0
            };
        } catch (e) {
            return null;
        }
    }

    
    publishGradients(metrics) {
        if (!metrics) return;
        
        const blockFactory = require('../../dag/block/block_factory');
        const payload = {
            input: metrics,
            state: { modelVersion: this.MODEL_VERSION }
        };

        
        blockFactory.createBlock('AI_GRADIENT', 'sys_ai_model', 'global_model', payload);
    }

    
    aggregateFederatedModel() {
        const db = dbManager.getDB('ledger');
        
        const blocks = db.query("SELECT payload FROM event_log WHERE event_type = 'AI_GRADIENT'");
        
        let totalAvg = 0;
        let count = 0;
        
        for (const b of blocks) {
            try {
                const decryptedPayloadHex = b.payload; 
                const buffer = Buffer.from(decryptedPayloadHex, 'hex');
                const clearPayload = JSON.parse(roleKeystore.decryptPayload('sys_ai_model', buffer).toString('utf8'));
                
                totalAvg += clearPayload.input.avgGrade;
                count++;
            } catch (e) {
                
            }
        }
        
        return count > 0 ? (totalAvg / count) : 0;
    }
}

module.exports = new FederatedLearningCoordinator();
