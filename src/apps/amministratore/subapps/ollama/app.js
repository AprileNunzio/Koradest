import { toast } from '../../../../js/utils.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default {
    render: async (el) => {
        try {
            el.innerHTML = `
                <div class="k-page fade-in-up" style="max-width: 1200px; margin: 0 auto; padding-bottom: 2rem;">
                    <header class="k-page-header">
                        <div class="k-page-heading">
                            <span class="k-page-icon material-symbols-rounded" style="color: var(--md-primary); background: var(--md-primary-container);">psychology</span>
                            <div>
                                <h1 class="k-page-title">Server Ollama & Intelligenza Artificiale</h1>
                                <p class="k-page-subtitle">Cluster LLM locale o di rete scolastica/aziendale, interoperabilità Matter e assistente Jarvis</p>
                            </div>
                        </div>
                        <div class="k-page-actions">
                            <button id="btn-test-ollama" class="k-btn">
                                <span class="material-symbols-rounded">speed</span>Test Connessione
                            </button>
                            <button id="btn-save-ollama" class="k-btn k-btn--primary">
                                <span class="material-symbols-rounded">save</span>Salva Configurazione
                            </button>
                        </div>
                    </header>

                    <div class="k-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="k-card" style="padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                            <span id="badge-status-icon" class="material-symbols-rounded" style="font-size: 2rem; color: var(--md-error);">cloud_off</span>
                            <div>
                                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--md-on-surface-variant); font-weight: 600;">Stato Cluster</div>
                                <div id="badge-status-text" style="font-size: 1.1rem; font-weight: bold; color: var(--md-error);">Disconnesso</div>
                            </div>
                        </div>
                        <div class="k-card" style="padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                            <span class="material-symbols-rounded" style="font-size: 2rem; color: var(--md-primary);">memory</span>
                            <div>
                                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--md-on-surface-variant); font-weight: 600;">Modello Attivo</div>
                                <div id="stat-active-model" style="font-size: 1.1rem; font-weight: bold;">--</div>
                            </div>
                        </div>
                        <div class="k-card" style="padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                            <span class="material-symbols-rounded" style="font-size: 2rem; color: #10b981;">timer</span>
                            <div>
                                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--md-on-surface-variant); font-weight: 600;">Latenza Rete</div>
                                <div id="stat-latency" style="font-size: 1.1rem; font-weight: bold;">-- ms</div>
                            </div>
                        </div>
                        <div class="k-card" style="padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                            <span class="material-symbols-rounded" style="font-size: 2rem; color: #8b5cf6;">hub</span>
                            <div>
                                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--md-on-surface-variant); font-weight: 600;">Matter Tools AI</div>
                                <div id="stat-tools-count" style="font-size: 1.1rem; font-weight: bold;">0 attivi</div>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
                        <section class="k-card">
                            <div class="k-card-header" style="border-bottom: 1px solid var(--k-border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                                <h2 class="k-card-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                                    <span class="material-symbols-rounded" style="color: var(--md-primary);">dns</span>Parametri Server & Cluster
                                </h2>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                <div class="k-field">
                                    <label class="k-label" for="ollama-host">Indirizzo Server Ollama</label>
                                    <input type="text" id="ollama-host" class="k-input" placeholder="http://127.0.0.1:11434">
                                    <span class="k-hint">Usa localhost oppure l'IP del server cluster (es. http://192.168.1.150:11434).</span>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="ollama-model">Modello Predefinito</label>
                                    <select id="ollama-model" class="k-input">
                                        <option value="llama3">llama3</option>
                                    </select>
                                    <span class="k-hint">Seleziona tra i modelli installati sul server o digita un nome valido.</span>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="ollama-temperature">Temperatura Risposta (<span id="temp-val">0.7</span>)</label>
                                    <input type="range" id="ollama-temperature" min="0" max="1" step="0.05" value="0.7" style="width: 100%;">
                                    <span class="k-hint">Valori bassi danno risposte più deterministiche; valori alti aumentano la creatività.</span>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="ollama-keepalive">Durata Memoria Contesto (Keep-Alive)</label>
                                    <input type="text" id="ollama-keepalive" class="k-input" placeholder="5m">
                                    <span class="k-hint">Tempo in cui il modello rimane caricato in RAM (es. 5m, 30m, -1 per illimitato).</span>
                                </div>
                                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; user-select: none;">
                                    <input type="checkbox" id="ollama-remote-allow" style="width: 1.1rem; height: 1.1rem;">
                                    <span style="font-size: 0.9rem;">Consenti instradamento query dai nodi della rete Koradest</span>
                                </label>
                            </div>
                        </section>

                        <section class="k-card">
                            <div class="k-card-header" style="border-bottom: 1px solid var(--k-border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                                <h2 class="k-card-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                                    <span class="material-symbols-rounded" style="color: #6366f1;">smart_toy</span>Assistente Globale "Jarvis"
                                </h2>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; user-select: none;">
                                    <input type="checkbox" id="jarvis-enabled" style="width: 1.1rem; height: 1.1rem;">
                                    <span style="font-size: 0.95rem; font-weight: 600;">Abilita widget assistente fluttuante su ogni schermata</span>
                                </label>
                                <div class="k-field">
                                    <label class="k-label" for="jarvis-prompt">Istruzioni di Personalità (System Prompt)</label>
                                    <textarea id="jarvis-prompt" class="k-input" rows="4" style="resize: vertical;"></textarea>
                                    <span class="k-hint">Guida il comportamento di Jarvis e come interagisce con gli strumenti Matter.</span>
                                </div>
                                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                    <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; user-select: none; flex: 1;">
                                        <input type="checkbox" id="jarvis-voice-tts" style="width: 1.1rem; height: 1.1rem;">
                                        <span style="font-size: 0.9rem;">Risposta Vocale (Text-To-Speech)</span>
                                    </label>
                                </div>
                                <div class="k-field">
                                    <label class="k-label" for="jarvis-voice-rate">Velocità Voce (<span id="rate-val">1.0</span>x)</label>
                                    <input type="range" id="jarvis-voice-rate" min="0.7" max="1.4" step="0.05" value="1.0" style="width: 100%;">
                                </div>
                            </div>
                        </section>
                    </div>

                    <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
                        <section class="k-card">
                            <div class="k-card-header" style="border-bottom: 1px solid var(--k-border); padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                                <h2 class="k-card-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                                    <span class="material-symbols-rounded" style="color: #8b5cf6;">terminal</span>Sandbox Test Query AI
                                </h2>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                                <div class="k-field">
                                    <input type="text" id="test-query-input" class="k-input" placeholder="Es. Chi sono i pazienti previsti per oggi? o Mostra i docenti in servizio">
                                </div>
                                <div style="display: flex; justify-content: flex-end;">
                                    <button id="btn-run-query" class="k-btn k-btn--primary">
                                        <span class="material-symbols-rounded">send</span>Invia Query di Prova
                                    </button>
                                </div>
                                <div id="test-query-result" class="k-card" style="background: var(--k-surface-alt, #0f172a08); min-height: 100px; padding: 0.8rem; font-size: 0.9rem; white-space: pre-wrap; word-break: break-word;">
                                    I risultati del test appariranno qui...
                                </div>
                            </div>
                        </section>

                        <section class="k-card">
                            <div class="k-card-header" style="border-bottom: 1px solid var(--k-border); padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                                <h2 class="k-card-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                                    <span class="material-symbols-rounded" style="color: #0d9488;">integration_instructions</span>Matter Tools Auto-Disponibili
                                </h2>
                                <span id="tools-pill" class="k-badge k-badge--primary">0</span>
                            </div>
                            <div id="tools-list-container" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
                                <div class="k-empty" style="padding: 1rem;">Caricamento strumenti in corso...</div>
                            </div>
                        </section>
                    </div>
                </div>
            `;

            const inputHost = el.querySelector('#ollama-host');
            const selectModel = el.querySelector('#ollama-model');
            const inputTemp = el.querySelector('#ollama-temperature');
            const tempVal = el.querySelector('#temp-val');
            const inputKeepAlive = el.querySelector('#ollama-keepalive');
            const checkRemoteAllow = el.querySelector('#ollama-remote-allow');
            const checkJarvisEnabled = el.querySelector('#jarvis-enabled');
            const inputJarvisPrompt = el.querySelector('#jarvis-prompt');
            const checkVoiceTts = el.querySelector('#jarvis-voice-tts');
            const inputVoiceRate = el.querySelector('#jarvis-voice-rate');
            const rateVal = el.querySelector('#rate-val');

            const badgeStatusIcon = el.querySelector('#badge-status-icon');
            const badgeStatusText = el.querySelector('#badge-status-text');
            const statActiveModel = el.querySelector('#stat-active-model');
            const statLatency = el.querySelector('#stat-latency');
            const statToolsCount = el.querySelector('#stat-tools-count');
            const toolsPill = el.querySelector('#tools-pill');
            const toolsContainer = el.querySelector('#tools-list-container');

            const testQueryInput = el.querySelector('#test-query-input');
            const testQueryResult = el.querySelector('#test-query-result');
            const btnRunQuery = el.querySelector('#btn-run-query');
            const btnTest = el.querySelector('#btn-test-ollama');
            const btnSave = el.querySelector('#btn-save-ollama');

            inputTemp.addEventListener('input', () => { tempVal.textContent = inputTemp.value; });
            inputVoiceRate.addEventListener('input', () => { rateVal.textContent = inputVoiceRate.value; });

            const aggiornaStatoGrafico = (status) => {
                try {
                    if (status && status.available) {
                        badgeStatusIcon.textContent = 'cloud_done';
                        badgeStatusIcon.style.color = '#10b981';
                        badgeStatusText.textContent = 'Online';
                        badgeStatusText.style.color = '#10b981';
                        statActiveModel.textContent = status.defaultModel || (status.models && status.models[0]) || 'llama3';
                        statLatency.textContent = status.latencyMs > 0 ? `${status.latencyMs} ms` : '<10 ms';
                    } else {
                        badgeStatusIcon.textContent = 'cloud_off';
                        badgeStatusIcon.style.color = 'var(--md-error)';
                        badgeStatusText.textContent = 'Non Raggiungibile';
                        badgeStatusText.style.color = 'var(--md-error)';
                        statActiveModel.textContent = '--';
                        statLatency.textContent = '--';
                    }
                } catch (err) { console.warn('[Ollama]', err && err.message ? err.message : err); }
            };

            const popolaModelli = (models, attivo) => {
                try {
                    selectModel.innerHTML = '';
                    const elenco = Array.isArray(models) && models.length > 0 ? models : ['llama3', 'mistral', 'phi3'];
                    elenco.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = m;
                        if (m === attivo) opt.selected = true;
                        selectModel.appendChild(opt);
                    });
                } catch (err) { console.warn('[Ollama]', err && err.message ? err.message : err); }
            };

            const caricaConfigurazione = async () => {
                try {
                    if (!window.electronAPI || !window.electronAPI.ollama) return;
                    const res = await window.electronAPI.ollama.getConfig();
                    if (res && res.success && res.data) {
                        const d = res.data;
                        inputHost.value = d.host || 'http://127.0.0.1:11434';
                        inputTemp.value = d.temperature ?? 0.7;
                        tempVal.textContent = inputTemp.value;
                        inputKeepAlive.value = d.keepAlive || '5m';
                        checkRemoteAllow.checked = Boolean(d.allowRemoteNodeAccess);
                        checkJarvisEnabled.checked = d.jarvisFloatingEnabled !== false;
                        inputJarvisPrompt.value = d.systemPrompt || '';
                        checkVoiceTts.checked = Boolean(d.voiceEnabled);
                        inputVoiceRate.value = d.voiceRate ?? 1.0;
                        rateVal.textContent = inputVoiceRate.value;
                    }

                    const statusRes = await window.electronAPI.ollama.getStatus();
                    aggiornaStatoGrafico(statusRes);
                    popolaModelli(statusRes.models, (res.data && res.data.defaultModel) || statusRes.defaultModel);

                    const toolsRes = await window.electronAPI.ollama.getRegisteredTools();
                    if (toolsRes && toolsRes.success) {
                        statToolsCount.textContent = `${toolsRes.count} attivi`;
                        toolsPill.textContent = String(toolsRes.count);
                        toolsContainer.innerHTML = '';
                        if (toolsRes.tools && toolsRes.tools.length > 0) {
                            toolsRes.tools.forEach(t => {
                                const row = document.createElement('div');
                                row.style.cssText = 'padding: 0.5rem; border-radius: 6px; background: var(--k-surface-alt, #0f172a0a); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; font-size: 0.85rem;';
                                row.innerHTML = `
                                    <div style="overflow: hidden; text-overflow: ellipsis;">
                                        <div style="font-weight: 600; color: var(--md-primary);">${esc(t.function.name)}</div>
                                        <div style="font-size: 0.75rem; color: var(--md-on-surface-variant);">${esc(t.function.description)}</div>
                                    </div>
                                    <span class="k-badge" style="font-size: 0.7rem;">Matter</span>
                                `;
                                toolsContainer.appendChild(row);
                            });
                        } else {
                            toolsContainer.innerHTML = '<div style="padding: 0.5rem; text-align: center; color: var(--md-on-surface-variant);">Nessun tool Matter registrato al momento</div>';
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            };

            btnTest.addEventListener('click', async () => {
                try {
                    btnTest.disabled = true;
                    btnTest.innerHTML = '<span class="material-symbols-rounded spin">refresh</span> Test in corso...';
                    const res = await window.electronAPI.ollama.testConnection({ host: inputHost.value.trim() });
                    btnTest.disabled = false;
                    btnTest.innerHTML = '<span class="material-symbols-rounded">speed</span> Test Connessione';
                    if (res && res.available) {
                        toast(`Connessione riuscita a ${res.host} in ${res.latencyMs} ms!`, 'success');
                        aggiornaStatoGrafico(res);
                        popolaModelli(res.models, selectModel.value);
                    } else {
                        toast(`Server non raggiungibile: ${(res && res.error) || 'Timeout'}`, 'error');
                        aggiornaStatoGrafico(res);
                    }
                } catch (e) {
                    btnTest.disabled = false;
                    btnTest.innerHTML = '<span class="material-symbols-rounded">speed</span> Test Connessione';
                    toast(`Errore durante il test: ${e.message}`, 'error');
                }
            });

            btnSave.addEventListener('click', async () => {
                try {
                    btnSave.disabled = true;
                    const payload = {
                        host: inputHost.value.trim() || 'http://127.0.0.1:11434',
                        defaultModel: selectModel.value || 'llama3',
                        temperature: parseFloat(inputTemp.value) || 0.7,
                        keepAlive: inputKeepAlive.value.trim() || '5m',
                        allowRemoteNodeAccess: checkRemoteAllow.checked,
                        jarvisFloatingEnabled: checkJarvisEnabled.checked,
                        systemPrompt: inputJarvisPrompt.value.trim(),
                        voiceEnabled: checkVoiceTts.checked,
                        voiceRate: parseFloat(inputVoiceRate.value) || 1.0
                    };
                    const res = await window.electronAPI.ollama.saveConfig(payload);
                    btnSave.disabled = false;
                    if (res && res.success) {
                        toast('Configurazione Ollama e Jarvis salvata con successo!', 'success');
                        window.dispatchEvent(new CustomEvent('koradest:ollama-config-changed', { detail: payload }));
                    } else {
                        toast(`Errore nel salvataggio: ${(res && res.error) || 'Sconosciuto'}`, 'error');
                    }
                } catch (e) {
                    btnSave.disabled = false;
                    toast(`Eccezione salvataggio: ${e.message}`, 'error');
                }
            });

            btnRunQuery.addEventListener('click', async () => {
                try {
                    const prompt = testQueryInput.value.trim();
                    if (!prompt) return;
                    btnRunQuery.disabled = true;
                    btnRunQuery.innerHTML = '<span class="material-symbols-rounded spin">refresh</span> Elaborazione...';
                    testQueryResult.textContent = 'Interrogazione del modello in corso (incluso eventuale Tool Calling)...';
                    const res = await window.electronAPI.ollama.chat({
                        prompt,
                        model: selectModel.value,
                        activeRoute: 'Amministratore / Ollama Subapp'
                    });
                    btnRunQuery.disabled = false;
                    btnRunQuery.innerHTML = '<span class="material-symbols-rounded">send</span> Invia Query di Prova';
                    if (res && res.success) {
                        testQueryResult.textContent = res.content || 'Nessun contenuto prodotto dal modello.';
                        if (res.toolCallsExecuted && res.toolCallsExecuted > 0) {
                            testQueryResult.textContent += `\n\n[Matter Tools eseguiti dal modello: ${res.toolCallsExecuted}]`;
                        }
                    } else {
                        testQueryResult.textContent = `Errore query: ${(res && res.error) || 'Errore sconosciuto'}`;
                    }
                } catch (e) {
                    btnRunQuery.disabled = false;
                    btnRunQuery.innerHTML = '<span class="material-symbols-rounded">send</span> Invia Query di Prova';
                    testQueryResult.textContent = `Errore di esecuzione: ${e.message}`;
                }
            });

            await caricaConfigurazione();
        } catch (e) {
            console.error(e);
            el.innerHTML = '<div class="k-empty"><span class="material-symbols-rounded">error</span><div>Errore nel caricamento di Ollama</div></div>';
        }
    }
};
