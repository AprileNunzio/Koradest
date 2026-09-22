'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

class OllamaClient {
    constructor(host = 'http://127.0.0.1:11434', defaultModel = 'llama3') {
        try {
            this.host = host;
            this.defaultModel = defaultModel;
            this.timeoutMs = 60000;
        } catch (e) {
            this.host = 'http://127.0.0.1:11434';
            this.defaultModel = 'llama3';
            this.timeoutMs = 60000;
        }
    }

    setHost(host) {
        try {
            if (host && typeof host === 'string') {
                this.host = host.replace(/\/+$/, '');
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    setDefaultModel(model) {
        try {
            if (model && typeof model === 'string') {
                this.defaultModel = model;
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async checkHealth() {
        try {
            const res = await this._request('GET', '/api/tags');
            return {
                available: res.statusCode === 200,
                models: res.data && res.data.models ? res.data.models.map(m => m.name) : [],
                host: this.host
            };
        } catch (e) {
            return {
                available: false,
                error: e.message,
                host: this.host
            };
        }
    }

    async chat({ messages = [], tools = [], model = null, format = null, stream = false } = {}) {
        try {
            const payload = {
                model: model || this.defaultModel,
                messages,
                stream: Boolean(stream)
            };

            if (Array.isArray(tools) && tools.length > 0) {
                payload.tools = tools;
            }

            if (format) {
                payload.format = format;
            }

            const response = await this._request('POST', '/api/chat', payload);
            if (response.statusCode >= 200 && response.statusCode < 300) {
                return { success: true, data: response.data };
            }
            return { success: false, statusCode: response.statusCode, error: response.data ? response.data.error : 'Unknown Ollama error' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async generate({ prompt = '', system = '', model = null } = {}) {
        try {
            const payload = {
                model: model || this.defaultModel,
                prompt,
                system,
                stream: false
            };

            const response = await this._request('POST', '/api/generate', payload);
            if (response.statusCode >= 200 && response.statusCode < 300) {
                return { success: true, data: response.data };
            }
            return { success: false, statusCode: response.statusCode, error: response.data ? response.data.error : 'Unknown Ollama error' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    _request(method, endpoint, body = null) {
        try {
            const parsedUrl = new URL(this.host + endpoint);
            const transport = parsedUrl.protocol === 'https:' ? https : http;

            const postData = body ? JSON.stringify(body) : null;
            const headers = {};
            if (postData) {
                headers['Content-Type'] = 'application/json';
                headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const options = {
                method,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                headers,
                timeout: this.timeoutMs
            };

            return new Promise((resolve, reject) => {
                try {
                    const req = transport.request(options, (res) => {
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => {
                            try {
                                const raw = Buffer.concat(chunks).toString('utf8');
                                let data;
                                try {
                                    data = JSON.parse(raw);
                                } catch (eJson) {
                                    data = raw;
                                }
                                resolve({ statusCode: res.statusCode, data });
                            } catch (eEnd) {
                                reject(eEnd);
                            }
                        });
                    });

                    req.on('error', (err) => {
                        reject(err);
                    });

                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error(`Ollama request timed out after ${this.timeoutMs}ms`));
                    });

                    if (postData) {
                        req.write(postData);
                    }
                    req.end();
                } catch (eReq) {
                    reject(eReq);
                }
            });
        } catch (e) {
            return Promise.reject(e);
        }
    }
}

module.exports = OllamaClient;
