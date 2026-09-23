import { valida } from '../utilita.js';

const NUMERICI = new Set(['numero', 'euro']);

export const tipoDi = campo => campo.tipo || 'testo';

export function vuoto(campo, valore) {
    if (tipoDi(campo) === 'checkbox') return !valore;
    return valore === null || valore === undefined || valore === '';
}

function erroreDiFormato(campo, valore) {
    const tipo = tipoDi(campo);
    if (tipo === 'email' && !valida.email(valore)) return 'Indirizzo email non valido';
    if (tipo === 'codiceFiscale' && !valida.codiceFiscale(valore)) return 'Codice fiscale non valido';
    if (tipo === 'partitaIva' && !valida.partitaIva(valore)) return 'Partita IVA non valida';
    if (tipo === 'telefono' && !valida.telefono(valore)) return 'Numero di telefono non valido';
    if (NUMERICI.has(tipo) && !Number.isFinite(valore)) return 'Inserisci un numero';
    if (campo.min !== undefined && Number(valore) < campo.min) return `Il minimo è ${campo.min}`;
    if (campo.max !== undefined && Number(valore) > campo.max) return `Il massimo è ${campo.max}`;
    if (campo.lunghezzaMassima && String(valore).length > campo.lunghezzaMassima) return `Al massimo ${campo.lunghezzaMassima} caratteri`;
    return null;
}

export function erroreCampo(campo, valore, valori) {
    const personalizzato = () => (typeof campo.valida === 'function' ? campo.valida(valore, valori) || null : null);
    if (vuoto(campo, valore)) return campo.obbligatorio ? 'Campo obbligatorio' : personalizzato();
    return erroreDiFormato(campo, valore) || personalizzato();
}

export function erroriDi(campi, valori) {
    return Object.fromEntries(
        campi
            .map(campo => [campo.nome, erroreCampo(campo, valori[campo.nome], valori)])
            .filter(([, messaggio]) => Boolean(messaggio))
    );
}

export function leggiValore(campo, elemento) {
    const tipo = tipoDi(campo);
    if (tipo === 'checkbox') return elemento.checked;
    if (NUMERICI.has(tipo)) return elemento.value === '' ? null : Number(elemento.value);
    if (tipo === 'codiceFiscale') return elemento.value.trim().toUpperCase();
    if (tipo === 'textarea') return elemento.value;
    return elemento.value.trim();
}
