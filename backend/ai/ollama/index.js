'use strict';

const OllamaClient = require('./OllamaClient');
const toolRegistry = require('./OllamaToolRegistry');
const rbacGuard = require('./OllamaRbacGuard');
const dataProtector = require('./OllamaDataProtector');
const OllamaMatterBridge = require('./OllamaMatterBridge');

const defaultBridge = new OllamaMatterBridge();

module.exports = {
    OllamaClient,
    toolRegistry,
    rbacGuard,
    dataProtector,
    OllamaMatterBridge,
    bridge: defaultBridge
};
