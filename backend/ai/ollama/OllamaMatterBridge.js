'use strict';

const OllamaClient = require('./OllamaClient');
const toolRegistry = require('./OllamaToolRegistry');
const rbacGuard = require('./OllamaRbacGuard');
const dataProtector = require('./OllamaDataProtector');
const UniversalEventBus = require('../../core/bus/UniversalEventBus');

class OllamaMatterBridge {
    constructor(options = {}) {
        try {
            this.client = new OllamaClient(options.host || 'http://127.0.0.1:11434', options.model || 'llama3');
            this.actionExecutors = new Map();
            this._setupBusListeners();
        } catch (e) {
            this.client = new OllamaClient();
            this.actionExecutors = new Map();
        }
    }

    setServer(host, model = null) {
        try {
            this.client.setHost(host);
            if (model) {
                this.client.setDefaultModel(model);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    registerActionExecutor(toolName, executorFn) {
        try {
            if (toolName && typeof executorFn === 'function') {
                this.actionExecutors.set(toolName, executorFn);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    _setupBusListeners() {
        try {
            UniversalEventBus.subscribe('koradest.ai.prompt', async (envelope) => {
                try {
                    if (!envelope || !envelope.payload) return;
                    const { user, prompt, model, systemPrompt, conversationId } = envelope.payload;
                    const response = await this.ask({ user, prompt, model, systemPrompt });

                    UniversalEventBus.publish('koradest.ai.completion', {
                        conversationId,
                        user: (user && user.id) || 'unknown',
                        response,
                        timestamp: Date.now()
                    });
                } catch (eSub) {
                    return false;
                }
            });
        } catch (e) {
            return false;
        }
    }

    async ask({ user = { id: 'anonymous', role: 'guest' }, prompt = '', model = null, systemPrompt = '' } = {}) {
        try {
            const promptCheck = dataProtector.sanitizeInputPrompt(prompt);
            if (!promptCheck.safe) {
                return {
                    success: false,
                    error: promptCheck.error || 'Prompt validation failed',
                    blocked: true
                };
            }

            const cleanPrompt = promptCheck.text;
            const messages = [];

            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: cleanPrompt });

            const toolsForUser = toolRegistry.getToolsForUser(user);

            const chatRes = await this.client.chat({
                messages,
                tools: toolsForUser,
                model
            });

            if (!chatRes.success) {
                return {
                    success: false,
                    error: chatRes.error,
                    serverHost: this.client.host
                };
            }

            const message = chatRes.data && chatRes.data.message;
            if (!message) {
                return { success: false, error: 'Empty message response from Ollama' };
            }

            if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
                const executedToolResults = [];

                for (const call of message.tool_calls) {
                    const fn = call.function;
                    const toolMeta = toolRegistry.getTool(fn.name);

                    const rbacCheck = rbacGuard.validateExecution(user, toolMeta ? toolMeta.metadata : null, fn.name);
                    if (!rbacCheck.allowed) {
                        executedToolResults.push({
                            role: 'tool',
                            content: JSON.stringify({ error: rbacCheck.error, status: 'DENIED' })
                        });
                        continue;
                    }

                    const execResult = await this._executeTool(fn.name, fn.arguments, user);
                    executedToolResults.push({
                        role: 'tool',
                        content: JSON.stringify(execResult)
                    });
                }

                const followUpMessages = [...messages, message, ...executedToolResults];
                const finalRes = await this.client.chat({
                    messages: followUpMessages,
                    model
                });

                if (finalRes.success && finalRes.data && finalRes.data.message) {
                    const sanitizedContent = dataProtector.sanitizeModelOutput(finalRes.data.message.content);
                    return {
                        success: true,
                        content: sanitizedContent,
                        toolCallsExecuted: executedToolResults.length
                    };
                }
            }

            const sanitizedContent = dataProtector.sanitizeModelOutput(message.content);
            return {
                success: true,
                content: sanitizedContent,
                toolCallsExecuted: 0
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async _executeTool(toolName, args, user) {
        try {
            if (this.actionExecutors.has(toolName)) {
                const executor = this.actionExecutors.get(toolName);
                return await executor(args, user);
            }

            const [appId, action] = String(toolName || '').split('__');
            if (appId && action) {
                try {
                    const capabilityBroker = require('../../security/capabilityBroker');
                    const res = await capabilityBroker.routeIpcCall('core:ai', appId, action, args || {}, {
                        origin: 'main',
                        contesto: user && user.id ? { userId: user.id } : null
                    });
                    return res !== undefined ? res : { success: true };
                } catch (eBroker) {
                    try {
                        const busResponse = await UniversalEventBus.request(`koradest.app.${appId}.${action}`, {
                            args,
                            callerUser: user
                        }, 5000);
                        return busResponse || { success: true };
                    } catch (eBus) {
                        return { error: `App execution failure: ${eBroker.message || eBus.message}` };
                    }
                }
            }

            return { error: `No executor found for tool: ${toolName}` };
        } catch (e) {
            return { error: e.message };
        }
    }
}

module.exports = OllamaMatterBridge;
