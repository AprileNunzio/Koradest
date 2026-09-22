'use strict';

const fs = require('fs');
const path = require('path');
const ollamaHandlers = require('../backend/handlers/ollama');
const { toolRegistry, bridge } = require('../backend/ai/ollama');
const appsRegistry = require('../backend/core/appsRegistry');

let failures = 0;
const check = (label, condition) => {
    try {
        console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
        if (!condition) failures++;
    } catch (e) {
        failures++;
    }
};

async function run() {
    try {
        const confRes = await ollamaHandlers.getConfig();
        check('ollamaHandlers.getConfig returns success and valid object', confRes && confRes.success && typeof confRes.data === 'object');
        check('ollamaHandlers.getConfig contains default host', confRes.data.host.includes('11434'));

        const saveRes = await ollamaHandlers.saveConfig(null, {
            host: 'http://127.0.0.1:11434',
            defaultModel: 'mistral',
            temperature: 0.8,
            jarvisFloatingEnabled: true
        });
        check('ollamaHandlers.saveConfig updates and persists config', saveRes && saveRes.success && saveRes.data.defaultModel === 'mistral');

        const reRead = await ollamaHandlers.getConfig();
        check('ollamaHandlers.getConfig reflects saved updates', reRead && reRead.data && reRead.data.defaultModel === 'mistral');

        const testConn = await ollamaHandlers.testConnection(null, { host: 'http://127.0.0.1:19999' });
        check('ollamaHandlers.testConnection handles unreachable server safely without throwing', testConn && testConn.available === false);

        const subapps = await appsRegistry.getSubAppsRegistry('amministratore');
        const ollamaSub = (subapps || []).find(s => s.id === 'ollama' || s.folder === 'ollama');
        check('appsRegistry.getSubAppsRegistry discovers ollama subapp', Boolean(ollamaSub));
        check('ollama subapp has valid name', ollamaSub && ollamaSub.name.includes('Ollama'));

        const subappDir = path.join(__dirname, '..', 'src', 'apps', 'amministratore', 'subapps', 'ollama');
        check('ollama subapp manifest exists', fs.existsSync(path.join(subappDir, 'manifest.json')));
        check('ollama subapp app.js exists', fs.existsSync(path.join(subappDir, 'app.js')));

        const manifest = JSON.parse(fs.readFileSync(path.join(subappDir, 'manifest.json'), 'utf8'));
        check('ollama manifest has id ollama', manifest.id === 'ollama');
        check('ollama manifest specifies app.js as main', manifest.main === 'app.js');

        const jarvisDir = path.join(__dirname, '..', 'src', 'js', 'shell', 'jarvis');
        check('jarvis directory exists', fs.existsSync(jarvisDir));
        check('jarvis index.js exists', fs.existsSync(path.join(jarvisDir, 'index.js')));
        check('jarvis chat_window.js exists', fs.existsSync(path.join(jarvisDir, 'chat_window.js')));
        check('jarvis context_reader.js exists', fs.existsSync(path.join(jarvisDir, 'context_reader.js')));
        check('jarvis voice.js exists', fs.existsSync(path.join(jarvisDir, 'voice.js')));
        check('jarvis jarvis.css exists', fs.existsSync(path.join(jarvisDir, 'jarvis.css')));

        const mockManifest = {
            id: 'app_test_ai',
            actions: {
                get_data: {
                    description: 'Ottiene dati di test',
                    role: 'user',
                    parameters: { type: 'object', properties: {} }
                }
            }
        };
        toolRegistry.registerAppManifest(mockManifest);
        const toolsRes = await ollamaHandlers.getRegisteredTools();
        check('ollamaHandlers.getRegisteredTools lists registered Matter tools', toolsRes && toolsRes.success && toolsRes.tools.some(t => t.function.name === 'app_test_ai__get_data'));

        console.log(`\nRisultato test Ollama & Jarvis: ${failures === 0 ? 'TUTTI I TEST SUPERATI' : `${failures} ERRORI`}`);
        if (failures > 0) process.exit(1);
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exit(1);
    }
}

run();
