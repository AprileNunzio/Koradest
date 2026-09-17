import { toast } from '../../utils.js';

const PAYPAL = 'https://paypal.me/NunzioAprile';
const EMAIL = 'mailto:info@nunziotech.com';
const SITO = 'https://nunziotech.it/';

export async function apriEsterno(indirizzo) {
    try {
        if (!window.electronAPI || typeof window.electronAPI.apriCollegamento !== 'function') {
            toast('Apertura di collegamenti non disponibile su questo nodo', 'error');
            return;
        }
        const esito = await window.electronAPI.apriCollegamento(indirizzo);
        if (!esito || esito.success !== true) {
            toast((esito && esito.error) || 'Collegamento non disponibile', 'error');
        }
    } catch (errore) {
        toast(errore.message || 'Impossibile aprire il collegamento', 'error');
    }
}

export function collegaAzioni(radice) {
    radice.querySelectorAll('[data-esterno]').forEach(nodo => {
        nodo.addEventListener('click', () => apriEsterno(nodo.dataset.esterno));
    });
}

export const INDIRIZZI = { PAYPAL, EMAIL, SITO };
