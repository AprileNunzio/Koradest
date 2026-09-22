'use strict';

const schemaRegistry = require('./CanonicalSchemaRegistry');
const FallbackCircuitBreaker = require('./FallbackCircuitBreaker');
const antiCorruptionGateway = require('./AntiCorruptionGateway');

module.exports = {
    schemaRegistry,
    FallbackCircuitBreaker,
    antiCorruptionGateway
};
