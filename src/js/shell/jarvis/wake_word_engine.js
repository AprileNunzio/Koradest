export class WakeWordEngine {
    constructor(jarvisInstance) {
        try {
            this.jarvis = jarvisInstance;
            this.recognition = null;
            this.active = false;
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                console.warn('[WakeWordEngine] SpeechRecognition API not supported.');
                return;
            }
            
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'it-IT';
            
            this.recognition.onresult = (event) => {
                try {
                    const lastResult = event.results[event.results.length - 1];
                    if (lastResult.isFinal) {
                        const transcript = lastResult[0].transcript.trim().toLowerCase();
                        if (transcript.includes('jarvis') || transcript.includes('ehi jarvis') || transcript.includes('hey jarvis')) {
                            console.log('[WakeWordEngine] Wake word detected!');
                            this.onWakeWordDetected();
                        }
                    }
                } catch (e) {
                    console.error('[WakeWordEngine] Error processing result:', e);
                }
            };
            
            this.recognition.onerror = (event) => {
                try {
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                        this.active = false;
                    }
                } catch (e) {
                    console.error('[WakeWordEngine] Error handling error:', e);
                }
            };
            
            this.recognition.onend = () => {
                try {
                    if (this.active) {
                        this.recognition.start();
                    }
                } catch (e) {
                    console.error('[WakeWordEngine] Error restarting recognition:', e);
                }
            };
        } catch (e) {
            console.error('[WakeWordEngine] Initialization error:', e);
        }
    }

    start() {
        try {
            if (!this.recognition || this.active) return;
            this.active = true;
            this.recognition.start();
            console.log('[WakeWordEngine] Started listening for wake word.');
        } catch (e) {
            console.error('[WakeWordEngine] Error starting:', e);
        }
    }

    stop() {
        try {
            if (!this.recognition || !this.active) return;
            this.active = false;
            this.recognition.stop();
            console.log('[WakeWordEngine] Stopped listening for wake word.');
        } catch (e) {
            console.error('[WakeWordEngine] Error stopping:', e);
        }
    }

    onWakeWordDetected() {
        try {
            if (this.jarvis) {
                this.jarvis.show();
                if (typeof this.jarvis.toggleSpeechRecognition === 'function') {
                    // Make sure it's active
                    if (!this.jarvis.isListening) {
                        this.jarvis.toggleSpeechRecognition();
                    }
                } else if (this.jarvis.micBtn) {
                    this.jarvis.micBtn.click();
                }
            } else {
                window.dispatchEvent(new CustomEvent('koradest:jarvis-wake'));
            }
        } catch (e) {
            console.error('[WakeWordEngine] Error executing wake action:', e);
        }
    }
}
