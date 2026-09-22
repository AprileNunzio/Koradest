'use strict';

const fs = require('fs');

class WasiPluginHost {
    constructor(options = {}) {
        try {
            this.maxMemoryPages = options.maxMemoryPages || 256;
            this.executionTimeoutMs = options.executionTimeoutMs || 5000;
            this.loadedPlugins = new Map();
        } catch (e) {
            this.maxMemoryPages = 256;
            this.executionTimeoutMs = 5000;
            this.loadedPlugins = new Map();
        }
    }

    async loadPlugin(pluginId, wasmSource, hostImports = {}) {
        try {
            if (!pluginId) throw new Error('Plugin ID is required');

            let wasmBytes;
            if (Buffer.isBuffer(wasmSource) || wasmSource instanceof Uint8Array) {
                wasmBytes = wasmSource;
            } else if (typeof wasmSource === 'string') {
                if (fs.existsSync(wasmSource)) {
                    wasmBytes = fs.readFileSync(wasmSource);
                } else {
                    wasmBytes = Buffer.from(wasmSource, 'base64');
                }
            } else {
                throw new Error('Invalid WASM source type');
            }

            const memory = new WebAssembly.Memory({
                initial: 1,
                maximum: this.maxMemoryPages
            });

            const defaultImports = {
                env: {
                    memory,
                    abort: (msg, file, line, col) => {
                        throw new Error(`WASM abort: ${msg} in ${file}:${line}:${col}`);
                    },
                    log_i32: (val) => {
                        return val;
                    }
                }
            };

            const mergedImports = Object.assign({}, defaultImports, hostImports);
            const wasmModule = await WebAssembly.compile(wasmBytes);
            const wasmInstance = await WebAssembly.instantiate(wasmModule, mergedImports);

            const pluginRecord = {
                id: pluginId,
                module: wasmModule,
                instance: wasmInstance,
                memory,
                exports: wasmInstance.exports,
                loadedAt: Date.now()
            };

            this.loadedPlugins.set(pluginId, pluginRecord);

            return {
                success: true,
                pluginId,
                exportedFunctions: Object.keys(wasmInstance.exports).filter(k => typeof wasmInstance.exports[k] === 'function')
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    invoke(pluginId, functionName, ...args) {
        try {
            const plugin = this.loadedPlugins.get(pluginId);
            if (!plugin) throw new Error(`Plugin '${pluginId}' not loaded`);

            const targetFn = plugin.exports[functionName];
            if (typeof targetFn !== 'function') {
                throw new Error(`Function '${functionName}' not exported by plugin '${pluginId}'`);
            }

            const result = targetFn(...args);
            return { success: true, result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    unloadPlugin(pluginId) {
        try {
            if (this.loadedPlugins.has(pluginId)) {
                this.loadedPlugins.delete(pluginId);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    getLoadedPlugins() {
        try {
            const list = [];
            for (const [id, rec] of this.loadedPlugins.entries()) {
                list.push({
                    id,
                    loadedAt: rec.loadedAt,
                    exportedFunctions: Object.keys(rec.exports).filter(k => typeof rec.exports[k] === 'function')
                });
            }
            return list;
        } catch (e) {
            return [];
        }
    }
}

module.exports = new WasiPluginHost();
