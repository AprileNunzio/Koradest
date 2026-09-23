'use strict';

const PARAMETRI_VUOTI = Object.freeze({ type: 'object', properties: {} });

function daRegistro(strumenti = [], metadatiDi = () => null) {
    return strumenti
        .filter(strumento => strumento && strumento.function && strumento.function.name)
        .map((strumento) => {
            const metadati = metadatiDi(strumento.function.name) || {};
            return Object.freeze({
                nome: strumento.function.name,
                descrizione: strumento.function.description || strumento.function.name,
                parametri: strumento.function.parameters || PARAMETRI_VUOTI,
                modifica: metadati.modifica === true,
                nomeApp: metadati.nomeApp || null,
                descrizioneApp: metadati.descrizioneApp || null
            });
        });
}

function scomponi(nome) {
    const [appId, ...resto] = String(nome || '').split('__');
    const azione = resto.join('__');
    return appId && azione ? { appId, azione } : null;
}

module.exports = { daRegistro, scomponi };
