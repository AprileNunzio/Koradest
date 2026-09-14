// Strumenti comuni per le app: HTML sicuro, formati italiani e validazioni.

export class HtmlSicuro {
    constructor(testo) {
        this.testo = testo;
    }

    toString() {
        return this.testo;
    }
}

const ENTITA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (valore) => String(valore ?? '').replace(/[&<>"']/g, carattere => ENTITA[carattere]);

export const sicuro = (testo) => new HtmlSicuro(String(testo ?? ''));

function interpola(valore) {
    if (valore instanceof HtmlSicuro) return valore.testo;
    if (Array.isArray(valore)) return valore.map(interpola).join('');
    if (valore === null || valore === undefined || valore === false) return '';
    return esc(valore);
}

// Template con escape automatico: html`<b>${nome}</b>` non esegue mai il contenuto di nome.
export function html(parti, ...valori) {
    let risultato = '';
    parti.forEach((parte, indice) => {
        risultato += parte;
        if (indice < valori.length) risultato += interpola(valori[indice]);
    });
    return new HtmlSicuro(risultato);
}

const SOLA_DATA = /^\d{4}-\d{2}-\d{2}$/;

function comeData(valore) {
    if (valore === null || valore === undefined || valore === '') return null;
    if (typeof valore === 'string' && SOLA_DATA.test(valore)) {
        const [anno, mese, giorno] = valore.split('-').map(Number);
        return new Date(anno, mese - 1, giorno);
    }
    const data = typeof valore === 'number' && valore < 1e12 ? new Date(valore * 1000) : new Date(valore);
    return Number.isNaN(data.getTime()) ? null : data;
}

const numeroValido = (valore) => valore !== null && valore !== undefined && valore !== '' && Number.isFinite(Number(valore));

export const formato = {
    data: (valore) => {
        const data = comeData(valore);
        return data ? data.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    },
    dataOra: (valore) => {
        const data = comeData(valore);
        return data ? data.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '';
    },
    euro: (valore) => (numeroValido(valore) ? Number(valore).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : ''),
    numero: (valore, decimali = 0) => (numeroValido(valore)
        ? Number(valore).toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: decimali })
        : ''),
    percentuale: (valore) => (numeroValido(valore) ? `${Number(valore).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%` : ''),
    isoData: (valore) => {
        const data = comeData(valore);
        if (!data) return '';
        const due = n => String(n).padStart(2, '0');
        return `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`;
    }
};

const CF_DISPARI = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
const CF_FORMA = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

export const valida = {
    codiceFiscale: (valore) => {
        const cf = String(valore || '').trim().toUpperCase();
        if (!CF_FORMA.test(cf)) return false;
        let somma = 0;
        for (let i = 0; i < 15; i++) {
            const carattere = cf[i];
            if (i % 2 === 0) somma += CF_DISPARI[carattere];
            else somma += /[0-9]/.test(carattere) ? Number(carattere) : carattere.charCodeAt(0) - 65;
        }
        return String.fromCharCode(65 + (somma % 26)) === cf[15];
    },
    partitaIva: (valore) => {
        const piva = String(valore || '').trim();
        if (!/^\d{11}$/.test(piva)) return false;
        let somma = 0;
        for (let i = 0; i < 11; i++) {
            let cifra = Number(piva[i]);
            if (i % 2 === 1) {
                cifra *= 2;
                if (cifra > 9) cifra -= 9;
            }
            somma += cifra;
        }
        return somma % 10 === 0;
    },
    email: (valore) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valore || '').trim()),
    telefono: (valore) => /^\+?[0-9 ()./-]{6,20}$/.test(String(valore || '').trim())
};
