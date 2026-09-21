'use strict';

const vm = require('vm');
const crypto = require('crypto');

class SmartContractVM {
    
    constructor() {
        this.timeoutMs = 500; 
    }

    _createSecureContext(inputData, stateData) {
        
        const sandbox = {
            input: JSON.parse(JSON.stringify(inputData || {})),
            state: JSON.parse(JSON.stringify(stateData || {})),
            output: {},
            crypto: {
                sha256: (data) => crypto.createHash('sha256').update(data).digest('hex')
            },
            Math: Math,
            Date: { now: () => Date.now() } 
        };
        return vm.createContext(sandbox);
    }

    executeContract(codeString, inputData, stateData) {
        const context = this._createSecureContext(inputData, stateData);
        
        try {
            
            const script = new vm.Script(`
                "use strict";
                try {
                    ${codeString}
                } catch(e) {
                    output.error = e.message;
                }
            `);

            script.runInContext(context, { timeout: this.timeoutMs });
            
            return {
                success: !context.output.error,
                output: context.output,
                error: context.output.error || null
            };
        } catch (err) {
            
            return {
                success: false,
                output: null,
                error: err.message
            };
        }
    }

    
    validateComputeBlock(contractCode, blockPayload, claimedOutput) {
        const result = this.executeContract(contractCode, blockPayload.input, blockPayload.state);
        if (!result.success) return false;
        
        
        const hashClaimed = crypto.createHash('sha256').update(JSON.stringify(claimedOutput)).digest('hex');
        const hashLocal = crypto.createHash('sha256').update(JSON.stringify(result.output)).digest('hex');
        
        return hashClaimed === hashLocal;
    }
}

module.exports = new SmartContractVM();
