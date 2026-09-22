import { JarvisChatWindow } from './chat_window.js';

let jarvisInstance = null;
let triggerEl = null;

function caricaFoglioStile() {
    try {
        if (document.querySelector('link[data-jarvis-css]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('./jarvis.css', import.meta.url).href;
        link.setAttribute('data-jarvis-css', '');
        document.head.appendChild(link);
    } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
}

function creaTrigger() {
    try {
        if (document.getElementById('jarvis-trigger')) return;

        const trigger = document.createElement('div');
        trigger.id = 'jarvis-trigger';
        trigger.className = 'jarvis-trigger';
        trigger.title = 'Apri Assistente Jarvis (Alt + J)';
        trigger.innerHTML = `
            <div class="jarvis-trigger-pulse"></div>
            <span class="material-symbols-rounded" style="font-size: 1.6rem;">smart_toy</span>
            <span class="jarvis-trigger-badge"></span>
        `;

        trigger.addEventListener('click', () => {
            try {
                if (jarvisInstance) {
                    jarvisInstance.toggle();
                }
            } catch (e) {
                console.error(e);
            }
        });

        document.body.appendChild(trigger);
        triggerEl = trigger;
    } catch (e) {
        console.error(e);
    }
}

export function initJarvis() {
    try {
        caricaFoglioStile();
        creaTrigger();

        if (!jarvisInstance) {
            jarvisInstance = new JarvisChatWindow();
        }

        window.addEventListener('keydown', (e) => {
            try {
                if ((e.altKey && (e.key === 'j' || e.key === 'J')) || (e.ctrlKey && e.code === 'Space')) {
                    e.preventDefault();
                    if (jarvisInstance) {
                        jarvisInstance.toggle();
                    }
                }
            } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
        });

        window.addEventListener('hashchange', () => {
            try {
                if (jarvisInstance) {
                    jarvisInstance.updateContextBadge();
                }
            } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
        });

        window.addEventListener('koradest:ollama-config-changed', (e) => {
            try {
                if (e.detail && e.detail.jarvisFloatingEnabled === false) {
                    if (triggerEl) triggerEl.style.display = 'none';
                    if (jarvisInstance) jarvisInstance.hide();
                } else if (triggerEl) {
                    triggerEl.style.display = 'flex';
                }
            } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
        });

        if (window.electronAPI && window.electronAPI.ollama) {
            window.electronAPI.ollama.getConfig().then(res => {
                try {
                    if (res && res.success && res.data) {
                        if (res.data.jarvisFloatingEnabled === false) {
                            if (triggerEl) triggerEl.style.display = 'none';
                        }
                    }
                } catch (err) { console.warn('[Jarvis]', err && err.message ? err.message : err); }
            }).catch(() => {});
        }

        return jarvisInstance;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export default initJarvis;
