import { conferma } from '../dialogo.js';

const PAGINE_SENZA_SESSIONE = /^(auth_|networks|setup|boot)/;

let valutato = false;

const api = () => (window.electronAPI && window.electronAPI.ai) || null;
const sessioneAttiva = () => Boolean(sessionStorage.getItem('currentUserId'));

async function chiediAttivazione() {
    return conferma({
        titolo: 'Attivare Jarvis?',
        testo: 'Jarvis è l\'assistente AI di KORADEST: risponde alle domande e può operare nelle applicazioni con i permessi di chi lo usa. Puoi cambiare idea quando vuoi da Amministratore › Server Ollama & AI.',
        etichetta: 'Attiva Jarvis',
        annulla: 'Tienilo spento',
        icona: 'smart_toy'
    });
}

export async function valutaAttivazione({ mostra, nascondi }) {
    if (!api() || !sessioneAttiva()) {
        valutato = false;
        nascondi();
        return;
    }
    if (valutato) return;
    valutato = true;
    const esito = await api().getJarvisState();
    if (!esito || !esito.success) {
        nascondi();
        return;
    }
    const { stato, puoDecidere } = esito.data;
    if (stato === 'attivo') {
        mostra();
        return;
    }
    if (stato !== 'da_chiedere' || !puoDecidere) {
        nascondi();
        return;
    }
    const attiva = await chiediAttivazione();
    const salvato = await api().setJarvisState({ stato: attiva ? 'attivo' : 'disattivo' });
    if (attiva && salvato && salvato.success) mostra();
    else nascondi();
}

export function paginaSenzaSessione(nomePagina) {
    return PAGINE_SENZA_SESSIONE.test(String(nomePagina || ''));
}

export function azzera() {
    valutato = false;
}
