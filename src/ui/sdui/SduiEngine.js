'use strict';

const validator = require('./SduiSchemaValidator');

class SduiEngine {
    constructor() {
        try {
            this.actionHandlers = new Map();
        } catch (e) {
            this.actionHandlers = new Map();
        }
    }

    registerActionHandler(actionName, handler) {
        try {
            if (!actionName || typeof handler !== 'function') return false;
            this.actionHandlers.set(actionName, handler);
            return true;
        } catch (e) {
            return false;
        }
    }

    _resolveBinding(state, bindingPath) {
        try {
            if (!state || !bindingPath) return '';
            const parts = bindingPath.split('.');
            let current = state;
            for (const part of parts) {
                if (current === undefined || current === null) return '';
                current = current[part];
            }
            return current !== undefined && current !== null ? current : '';
        } catch (e) {
            return '';
        }
    }

    renderToDescriptor(schema, state = {}) {
        try {
            const validation = validator.validateViewSchema(schema);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors
                };
            }

            const renderedTree = this._renderComponentDescriptor(schema.root, state);
            return {
                success: true,
                title: schema.title,
                tree: renderedTree
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    _renderComponentDescriptor(component, state) {
        try {
            const descriptor = {
                id: component.id,
                type: component.type,
                props: Object.assign({}, component.props || {}),
                children: []
            };

            if (component.binding) {
                descriptor.value = this._resolveBinding(state, component.binding);
            }

            if (Array.isArray(component.children)) {
                for (const child of component.children) {
                    const childDesc = this._renderComponentDescriptor(child, state);
                    if (childDesc) {
                        descriptor.children.push(childDesc);
                    }
                }
            }

            return descriptor;
        } catch (e) {
            return null;
        }
    }

    async dispatchAction(actionName, payload = {}, state = {}) {
        try {
            const handler = this.actionHandlers.get(actionName);
            if (!handler) {
                return { success: false, error: `Nessun gestore registrato per l azione UI: ${actionName}` };
            }
            const result = await handler(payload, state);
            return { success: true, result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = new SduiEngine();
