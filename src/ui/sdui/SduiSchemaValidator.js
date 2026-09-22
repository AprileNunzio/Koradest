'use strict';

class SduiSchemaValidator {
    constructor() {
        try {
            this.validComponentTypes = new Set([
                'container',
                'card',
                'form',
                'text-input',
                'number-input',
                'date-input',
                'select',
                'button',
                'table',
                'stat-metric',
                'badge',
                'alert'
            ]);
        } catch (e) {
            this.validComponentTypes = new Set();
        }
    }

    validateComponent(component) {
        try {
            if (!component || typeof component !== 'object') {
                return { valid: false, errors: ['Il componente deve essere un oggetto'] };
            }

            const errors = [];
            if (!component.type || !this.validComponentTypes.has(component.type)) {
                errors.push(`Tipo componente non valido o non supportato: ${component.type}`);
            }

            if (!component.id || typeof component.id !== 'string') {
                errors.push('ID componente obbligatorio');
            }

            if (Array.isArray(component.children)) {
                for (const child of component.children) {
                    const childVal = this.validateComponent(child);
                    if (!childVal.valid) {
                        errors.push(...childVal.errors);
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors
            };
        } catch (e) {
            return { valid: false, errors: [e.message] };
        }
    }

    validateViewSchema(schema) {
        try {
            if (!schema || typeof schema !== 'object') {
                return { valid: false, errors: ['Lo schema della vista deve essere un oggetto'] };
            }

            const errors = [];
            if (!schema.title || typeof schema.title !== 'string') {
                errors.push('Titolo della vista obbligatorio');
            }

            if (!schema.root || typeof schema.root !== 'object') {
                errors.push('Componente radice (root) mancante o non valido');
            } else {
                const rootVal = this.validateComponent(schema.root);
                if (!rootVal.valid) {
                    errors.push(...rootVal.errors);
                }
            }

            return {
                valid: errors.length === 0,
                errors
            };
        } catch (e) {
            return { valid: false, errors: [e.message] };
        }
    }
}

module.exports = new SduiSchemaValidator();
