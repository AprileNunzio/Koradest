import { JarvisChatWindow } from './chat_window.js';
import { valutaAttivazione, paginaSenzaSessione, azzera } from './attivazione.js';
import { WakeWordEngine } from './wake_word_engine.js';

let jarvisInstance = null;
let triggerEl = null;
let attivo = false;
let wakeWordEngine = null;

function caricaFoglioStile() {
    if (document.querySelector('link[data-jarvis-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./jarvis.css', import.meta.url).href;
    link.setAttribute('data-jarvis-css', '');
    document.head.appendChild(link);
}

function creaTrigger() {
    if (document.getElementById('jarvis-trigger')) return document.getElementById('jarvis-trigger');
    const trigger = document.createElement('div');
    trigger.id = 'jarvis-trigger';
    trigger.className = 'jarvis-trigger';
    trigger.title = 'Apri Assistente Jarvis (Alt + J)';
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', "Apri l'assistente Jarvis");
    trigger.tabIndex = 0;
    trigger.hidden = true;
    trigger.innerHTML = `
        <div class="jarvis-trigger-pulse"></div>
        <span class="material-symbols-rounded" aria-hidden="true">smart_toy</span>
        <span class="jarvis-trigger-badge"></span>
    `;
    trigger.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            trigger.click();
        }
    });
    trigger.addEventListener('click', () => jarvisInstance && jarvisInstance.toggle());
    document.body.appendChild(trigger);
    return trigger;
}

function mostra() {
    attivo = true;
    triggerEl.hidden = false;
}

function nascondi() {
    attivo = false;
    triggerEl.hidden = true;
    if (jarvisInstance) jarvisInstance.hide();
}

const valuta = () => valutaAttivazione({ mostra, nascondi });

export async function initJarvis() {
    caricaFoglioStile();
    triggerEl = creaTrigger();
    if (!jarvisInstance) {
        jarvisInstance = new JarvisChatWindow();
        wakeWordEngine = new WakeWordEngine(jarvisInstance);
    }
    jarvisInstance.hide();

    try {
        if (window.electronAPI && window.electronAPI.ai) {
            const res = await window.electronAPI.ai.getConfig();
            if (res && res.success && res.data && res.data.ascoltoContinuo) {
                wakeWordEngine.start();
            }
        }
    } catch (e) {
        console.warn('[Jarvis] Errore nel caricamento della configurazione', e);
    }

    window.addEventListener('keydown', (evento) => {
        const scorciatoia = (evento.altKey && (evento.key === 'j' || evento.key === 'J')) || (evento.ctrlKey && evento.code === 'Space');
        if (!scorciatoia || !attivo) return;
        evento.preventDefault();
        jarvisInstance.toggle();
    });

    window.addEventListener('hashchange', () => {
        if (attivo) jarvisInstance.updateContextBadge();
    });

    window.addEventListener('router:navigated', (evento) => {
        if (paginaSenzaSessione(evento.detail && evento.detail.pageName)) {
            azzera();
            nascondi();
            return;
        }
        valuta();
    });

    window.addEventListener('koradest:jarvis-stato', async (evento) => {
        azzera();
        if (evento.detail && evento.detail.stato === 'attivo') mostra();
        else nascondi();
        
        try {
            if (window.electronAPI && window.electronAPI.ai) {
                const res = await window.electronAPI.ai.getConfig();
                if (res && res.success && res.data) {
                    if (res.data.ascoltoContinuo) {
                        wakeWordEngine.start();
                    } else {
                        wakeWordEngine.stop();
                    }
                }
            }
        } catch (e) {
            console.warn('[Jarvis] Errore nell\'aggiornamento dell\'ascolto continuo', e);
        }
    });

    valuta();
    return jarvisInstance;
}

export default initJarvis;
