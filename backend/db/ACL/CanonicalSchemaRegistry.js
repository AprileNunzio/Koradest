'use strict';

class CanonicalSchemaRegistry {
    constructor() {
        try {
            this.schemas = new Map();
            this.registerCoreSchemas();
        } catch (e) {
            this.schemas = new Map();
        }
    }

    registerCoreSchemas() {
        try {
            this.registerSchema('CanonicalPerson', {
                fields: {
                    id: { type: 'string', required: true },
                    firstName: { type: 'string', required: true },
                    lastName: { type: 'string', required: true },
                    taxCode: { type: 'string', required: false },
                    birthDate: { type: 'string', required: false },
                    email: { type: 'string', required: false },
                    phone: { type: 'string', required: false },
                    gender: { type: 'string', required: false },
                    address: { type: 'string', required: false },
                    metadata: { type: 'object', required: false }
                }
            });

            this.registerSchema('CanonicalAppointment', {
                fields: {
                    id: { type: 'string', required: true },
                    subjectId: { type: 'string', required: true },
                    operatorId: { type: 'string', required: false },
                    startsAt: { type: 'string', required: true },
                    endsAt: { type: 'string', required: false },
                    status: { type: 'string', required: true, default: 'scheduled' },
                    location: { type: 'string', required: false },
                    notes: { type: 'string', required: false },
                    metadata: { type: 'object', required: false }
                }
            });

            this.registerSchema('CanonicalDocument', {
                fields: {
                    id: { type: 'string', required: true },
                    ownerId: { type: 'string', required: true },
                    category: { type: 'string', required: true },
                    title: { type: 'string', required: true },
                    fileHash: { type: 'string', required: false },
                    mimeType: { type: 'string', required: false },
                    createdAt: { type: 'string', required: true },
                    metadata: { type: 'object', required: false }
                }
            });

            this.registerSchema('CanonicalTransaction', {
                fields: {
                    id: { type: 'string', required: true },
                    accountId: { type: 'string', required: true },
                    amount: { type: 'number', required: true },
                    currency: { type: 'string', required: true, default: 'EUR' },
                    direction: { type: 'string', required: true },
                    timestamp: { type: 'string', required: true },
                    category: { type: 'string', required: false },
                    metadata: { type: 'object', required: false }
                }
            });
        } catch (e) {
            return false;
        }
    }

    registerSchema(name, definition) {
        try {
            if (!name || typeof name !== 'string') {
                throw new Error('Nome schema non valido');
            }
            if (!definition || typeof definition !== 'object' || !definition.fields) {
                throw new Error('Definizione schema non valida');
            }
            this.schemas.set(name, definition);
            return true;
        } catch (e) {
            return false;
        }
    }

    hasSchema(name) {
        try {
            return this.schemas.has(name);
        } catch (e) {
            return false;
        }
    }

    getSchema(name) {
        try {
            return this.schemas.get(name) || null;
        } catch (e) {
            return null;
        }
    }

    validateAndNormalize(schemaName, data) {
        try {
            const schema = this.getSchema(schemaName);
            if (!schema) {
                return { valid: false, errors: [`Schema ${schemaName} non registrato`], data: null };
            }
            if (!data || typeof data !== 'object') {
                return { valid: false, errors: ['I dati forniti non sono un oggetto'], data: null };
            }

            const errors = [];
            const normalized = {};

            for (const [field, rules] of Object.entries(schema.fields)) {
                let value = data[field];

                if (value === undefined || value === null || value === '') {
                    if (rules.required) {
                        errors.push(`Campo obbligatorio mancante: ${field}`);
                        continue;
                    }
                    if (rules.default !== undefined) {
                        value = rules.default;
                    } else {
                        normalized[field] = null;
                        continue;
                    }
                }

                if (rules.type === 'string') {
                    normalized[field] = String(value).trim();
                } else if (rules.type === 'number') {
                    const num = Number(value);
                    if (isNaN(num)) {
                        errors.push(`Campo ${field} deve essere numerico`);
                    } else {
                        normalized[field] = num;
                    }
                } else if (rules.type === 'object') {
                    normalized[field] = typeof value === 'object' ? value : {};
                } else if (rules.type === 'boolean') {
                    normalized[field] = Boolean(value);
                } else {
                    normalized[field] = value;
                }
            }

            if (errors.length > 0) {
                return { valid: false, errors, data: null };
            }

            return { valid: true, errors: [], data: normalized };
        } catch (e) {
            return { valid: false, errors: [e.message], data: null };
        }
    }
}

module.exports = new CanonicalSchemaRegistry();
