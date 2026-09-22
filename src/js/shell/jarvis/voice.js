let recognitionInstance = null;
let isListeningActive = false;

export function isSpeechRecognitionSupported() {
    try {
        return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    } catch (_) {
        return false;
    }
}

export function isSpeechSynthesisSupported() {
    try {
        return Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== 'undefined');
    } catch (_) {
        return false;
    }
}

export function avviaAscolto({ onResult, onError, onEnd }) {
    try {
        if (!isSpeechRecognitionSupported()) {
            if (onError) onError('Riconoscimento vocale non supportato dal motore browser');
            return null;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionInstance = new SpeechRec();
        recognitionInstance.lang = 'it-IT';
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;

        recognitionInstance.onstart = () => {
            isListeningActive = true;
        };

        recognitionInstance.onresult = (event) => {
            try {
                let trascrizione = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    trascrizione += event.results[i][0].transcript;
                }
                if (onResult) onResult(trascrizione, event.results[event.results.length - 1].isFinal);
            } catch (e) {
                if (onError) onError(e.message);
            }
        };

        recognitionInstance.onerror = (event) => {
            try {
                isListeningActive = false;
                if (onError) onError(event.error || 'Errore microfono');
            } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
        };

        recognitionInstance.onend = () => {
            try {
                isListeningActive = false;
                if (onEnd) onEnd();
            } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
        };

        recognitionInstance.start();
        return recognitionInstance;
    } catch (e) {
        if (onError) onError(e.message);
        return null;
    }
}

export function arrestaAscolto() {
    try {
        if (recognitionInstance && isListeningActive) {
            recognitionInstance.stop();
            isListeningActive = false;
        }
    } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
}

export function pronuncia(testo, opzioni = {}) {
    try {
        if (!isSpeechSynthesisSupported() || !testo) return;
        window.speechSynthesis.cancel();

        const pulito = String(testo)
            .replace(/[#*_`~>[\]]/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .slice(0, 800);

        const ut = new SpeechSynthesisUtterance(pulito);
        ut.lang = 'it-IT';
        ut.rate = opzioni.rate || 1.0;
        ut.pitch = opzioni.pitch || 1.0;

        const voci = window.speechSynthesis.getVoices();
        const voceItaliana = voci.find(v => v.lang && v.lang.startsWith('it'));
        if (voceItaliana) {
            ut.voice = voceItaliana;
        }

        window.speechSynthesis.speak(ut);
    } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
}

export function interrompiPronuncia() {
    try {
        if (isSpeechSynthesisSupported()) {
            window.speechSynthesis.cancel();
        }
    } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
}
