'use strict';

const schemaRegistry = require('./CanonicalSchemaRegistry');
const FallbackCircuitBreaker = require('./FallbackCircuitBreaker');

class AntiCorruptionGateway {
    constructor() {
        try {
            this.adapters = new Map();
            this.circuitBreakers = new Map();
        } catch (e) {
            this.adapters = new Map();
            this.circuitBreakers = new Map();
        }
    }

    _getCircuitBreaker(vendorId) {
        try {
            if (!this.circuitBreakers.has(vendorId)) {
                this.circuitBreakers.set(vendorId, new FallbackCircuitBreaker({
                    failureThreshold: 3,
                    recoveryTimeMs: 15000
                }));
            }
            return this.circuitBreakers.get(vendorId);
        } catch (e) {
            return new FallbackCircuitBreaker();
        }
    }

    registerAdapter(vendorId, adapterConfig) {
        try {
            if (!vendorId || typeof vendorId !== 'string') {
                throw new Error('vendorId obbligatorio');
            }
            if (!adapterConfig || typeof adapterConfig !== 'object') {
                throw new Error('adapterConfig obbligatorio');
            }
            if (!adapterConfig.canonicalSchema) {
                throw new Error('canonicalSchema obbligatorio nell adapter');
            }
            if (typeof adapterConfig.toCanonical !== 'function') {
                throw new Error('toCanonical deve essere una funzione');
            }

            this.adapters.set(vendorId, adapterConfig);
            return true;
        } catch (e) {
            return false;
        }
    }

    hasAdapter(vendorId) {
        try {
            return this.adapters.has(vendorId);
        } catch (e) {
            return false;
        }
    }

    async ingest(vendorId, externalPayload, options = {}) {
        try {
            if (!externalPayload || typeof externalPayload !== 'object') {
                return {
                    success: false,
                    error: 'Payload esterno non valido o nullo'
                };
            }

            const adapter = this.adapters.get(vendorId);
            if (!adapter) {
                return {
                    success: false,
                    error: `Nessun adapter registrato per il vendor: ${vendorId}`
                };
            }

            const circuitBreaker = this._getCircuitBreaker(vendorId);
            const cacheKey = options.cacheKey || (options.entityId ? `${vendorId}_${options.entityId}` : `${vendorId}_anonymous`);

            const execution = await circuitBreaker.execute(
                cacheKey,
                async () => {
                    const mapped = await adapter.toCanonical(externalPayload);
                    if (!mapped || typeof mapped !== 'object') {
                        throw new Error('La traduzione toCanonical ha restituito un valore non valido');
                    }
                    const validation = schemaRegistry.validateAndNormalize(adapter.canonicalSchema, mapped);
                    if (!validation.valid) {
                        throw new Error(`Validazione schema canonico fallita: ${validation.errors.join('; ')}`);
                    }
                    return validation.data;
                },
                options.fallbackFn || null,
                { allowFallback: options.allowFallback !== false }
            );

            if (!execution.success) {
                return {
                    success: false,
                    circuitOpen: execution.circuitOpen,
                    error: execution.error
                };
            }

            return {
                success: true,
                fromFallback: execution.fromFallback,
                circuitOpen: execution.circuitOpen,
                canonicalData: execution.data
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }

    async egress(vendorId, canonicalPayload) {
        try {
            const adapter = this.adapters.get(vendorId);
            if (!adapter) {
                return {
                    success: false,
                    error: `Nessun adapter registrato per il vendor: ${vendorId}`
                };
            }

            const validation = schemaRegistry.validateAndNormalize(adapter.canonicalSchema, canonicalPayload);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Dati canonici non conformi: ${validation.errors.join('; ')}`
                };
            }

            if (typeof adapter.toExternal !== 'function') {
                return {
                    success: false,
                    error: `L adapter ${vendorId} non implementa la traduzione toExternal`
                };
            }

            const externalData = await adapter.toExternal(validation.data);
            return {
                success: true,
                externalData
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }
}

module.exports = new AntiCorruptionGateway();
