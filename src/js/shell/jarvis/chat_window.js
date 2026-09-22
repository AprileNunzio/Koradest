import { ottieniContestoVisivo, ottieniNotizieAvvisi } from './context_reader.js';
import { avviaAscolto, arrestaAscolto, pronuncia, interrompiPronuncia, isSpeechRecognitionSupported } from './voice.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export class JarvisChatWindow {
    constructor() {
        try {
            this.panelEl = null;
            this.messagesContainer = null;
            this.inputEl = null;
            this.micBtn = null;
            this.contextPill = null;
            this.isVoiceEnabled = false;
            this.voiceRate = 1.0;
            this.isListening = false;
            this._buildDOM();
        } catch (e) {
            console.error(e);
        }
    }

    _buildDOM() {
        try {
            const panel = document.createElement('div');
            panel.id = 'jarvis-panel';
            panel.className = 'jarvis-panel';
            panel.hidden = true;
            panel.innerHTML = `
                <div class="jarvis-header">
                    <div class="jarvis-brand">
                        <div class="jarvis-orb">
                            <span class="material-symbols-rounded" style="font-size: 1.2rem;">psychology</span>
                        </div>
                        <div class="jarvis-title-wrap">
                            <span class="jarvis-name">Jarvis AI</span>
                            <span class="jarvis-status"><span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>Operativo</span>
                        </div>
                    </div>
                    <span id="jarvis-context-pill" class="jarvis-context-pill" title="Contesto attivo">Dashboard</span>
                    <div class="jarvis-controls">
                        <button id="jarvis-btn-clear" class="jarvis-btn-icon" title="Pulisci cronologia"><span class="material-symbols-rounded" style="font-size: 1.1rem;">delete_sweep</span></button>
                        <button id="jarvis-btn-minimize" class="jarvis-btn-icon" title="Riduci a icona"><span class="material-symbols-rounded" style="font-size: 1.1rem;">close</span></button>
                    </div>
                </div>
                <div id="jarvis-body" class="jarvis-body">
                    <div class="jarvis-msg jarvis-msg--assistant">
                        <div>Ciao, sono <strong>Jarvis</strong>. Vedo quello che hai sullo schermo e posso operare direttamente sulle applicazioni Koradest o rispondere alle tue domande. Come posso aiutarti?</div>
                    </div>
                </div>
                <div class="jarvis-footer">
                    <div class="jarvis-input-bar">
                        <textarea id="jarvis-input" class="jarvis-input" rows="1" placeholder="Chiedi o impartisci un comando..."></textarea>
                        <button id="jarvis-btn-mic" class="jarvis-btn-mic" title="Ascolta con microfono"><span class="material-symbols-rounded" style="font-size: 1.2rem;">mic</span></button>
                        <button id="jarvis-btn-send" class="jarvis-btn-send" title="Invia"><span class="material-symbols-rounded" style="font-size: 1.1rem;">send</span></button>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);

            this.panelEl = panel;
            this.messagesContainer = panel.querySelector('#jarvis-body');
            this.inputEl = panel.querySelector('#jarvis-input');
            this.micBtn = panel.querySelector('#jarvis-btn-mic');
            this.contextPill = panel.querySelector('#jarvis-context-pill');

            panel.querySelector('#jarvis-btn-minimize').addEventListener('click', () => this.hide());
            panel.querySelector('#jarvis-btn-clear').addEventListener('click', () => this.clearChat());
            panel.querySelector('#jarvis-btn-send').addEventListener('click', () => this.sendCurrentMessage());

            this.inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendCurrentMessage();
                }
            });

            this.micBtn.addEventListener('click', () => this.toggleSpeechRecognition());
            this._loadSettings();
            this._checkProactiveAlerts();
        } catch (e) {
            console.error(e);
        }
    }

    async _loadSettings() {
        try {
            if (window.electronAPI && window.electronAPI.ollama) {
                const res = await window.electronAPI.ollama.getConfig();
                if (res && res.success && res.data) {
                    this.isVoiceEnabled = Boolean(res.data.voiceEnabled);
                    this.voiceRate = res.data.voiceRate || 1.0;
                }
            }
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    async _checkProactiveAlerts() {
        try {
            const avvisi = await ottieniNotizieAvvisi();
            if (avvisi && avvisi.length > 0) {
                this.addMessage('assistant', `Ho trovato ${avvisi.length} nuove notifiche di sistema:\n` + avvisi.map(a => `• ${a}`).join('\n'));
            }
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    updateContextBadge() {
        try {
            const ctx = ottieniContestoVisivo();
            if (this.contextPill) {
                this.contextPill.textContent = ctx.titolo || ctx.route || 'Dashboard';
                this.contextPill.title = `Contesto: ${ctx.route}`;
            }
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    toggle() {
        try {
            if (this.panelEl.hidden) {
                this.show();
            } else {
                this.hide();
            }
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    show() {
        try {
            this.updateContextBadge();
            this.panelEl.hidden = false;
            this.inputEl.focus();
            this.scrollToBottom();
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    hide() {
        try {
            this.panelEl.hidden = true;
            arrestaAscolto();
            interrompiPronuncia();
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    clearChat() {
        try {
            this.messagesContainer.innerHTML = '';
            this.addMessage('assistant', 'Cronologia pulita. Sono pronto per una nuova richiesta.');
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    addMessage(role, text, toolCallCount = 0) {
        try {
            const msgEl = document.createElement('div');
            msgEl.className = `jarvis-msg jarvis-msg--${role}`;

            let htmlContent = '';
            if (toolCallCount > 0) {
                htmlContent += `<div class="jarvis-msg-tool"><span class="material-symbols-rounded" style="font-size: 0.9rem;">build</span>Eseguiti ${toolCallCount} comandi Matter</div>`;
            }

            const formatted = esc(text).replace(/\n/g, '<br>');
            htmlContent += `<div>${formatted}</div>`;
            msgEl.innerHTML = htmlContent;

            this.messagesContainer.appendChild(msgEl);
            this.scrollToBottom();
        } catch (e) {
            console.error(e);
        }
    }

    showThinking() {
        try {
            const thinking = document.createElement('div');
            thinking.id = 'jarvis-thinking-indicator';
            thinking.className = 'jarvis-msg jarvis-msg--assistant jarvis-thinking';
            thinking.innerHTML = `
                <div class="jarvis-dot"></div>
                <div class="jarvis-dot"></div>
                <div class="jarvis-dot"></div>
                <span>Jarvis sta elaborando...</span>
            `;
            this.messagesContainer.appendChild(thinking);
            this.scrollToBottom();
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    hideThinking() {
        try {
            const thinking = this.messagesContainer.querySelector('#jarvis-thinking-indicator');
            if (thinking) thinking.remove();
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    scrollToBottom() {
        try {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
    }

    toggleSpeechRecognition() {
        try {
            if (!isSpeechRecognitionSupported()) {
                this.addMessage('assistant', 'Il riconoscimento vocale non è supportato in questo ambiente.');
                return;
            }

            if (this.isListening) {
                arrestaAscolto();
                this.isListening = false;
                this.micBtn.classList.remove('listening');
            } else {
                this.isListening = true;
                this.micBtn.classList.add('listening');
                avviaAscolto({
                    onResult: (text, isFinal) => {
                        this.inputEl.value = text;
                        if (isFinal) {
                            arrestaAscolto();
                            this.isListening = false;
                            this.micBtn.classList.remove('listening');
                            this.sendCurrentMessage();
                        }
                    },
                    onError: (err) => {
                        this.isListening = false;
                        this.micBtn.classList.remove('listening');
                    },
                    onEnd: () => {
                        this.isListening = false;
                        this.micBtn.classList.remove('listening');
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    async sendCurrentMessage() {
        try {
            const text = this.inputEl.value.trim();
            if (!text) return;
            this.inputEl.value = '';

            this.addMessage('user', text);
            this.showThinking();

            const visualContext = ottieniContestoVisivo();
            if (window.electronAPI && window.electronAPI.ollama) {
                const res = await window.electronAPI.ollama.chat({
                    prompt: text,
                    activeRoute: visualContext.route,
                    pageContext: visualContext.dettagliPagina
                });

                this.hideThinking();
                if (res && res.success) {
                    const reply = res.content || 'Comando completato.';
                    this.addMessage('assistant', reply, res.toolCallsExecuted || 0);
                    if (this.isVoiceEnabled) {
                        pronuncia(reply, { rate: this.voiceRate });
                    }
                } else {
                    this.addMessage('assistant', `Non sono riuscito a completare la richiesta: ${(res && res.error) || 'Errore di connessione a Ollama'}`);
                }
            } else {
                this.hideThinking();
                this.addMessage('assistant', 'Servizio Ollama non disponibile.');
            }
        } catch (e) {
            this.hideThinking();
            this.addMessage('assistant', `Si è verificata un'eccezione: ${e.message}`);
        }
    }
}
