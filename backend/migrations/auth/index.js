const core = require('./schema_core');
const anagrafica = require('./schema_anagrafica');
const networkPolicy = require('./schema_network_policy');

module.exports = [...core, ...anagrafica, ...networkPolicy];
