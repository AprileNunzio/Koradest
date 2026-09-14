'use strict';

// Pianificatore di sistema: le applicazioni non creano timer propri, chiedono al kernel
// di eseguire una funzione secondo un'espressione cron a cinque campi
// (minuto ora giorno-del-mese mese giorno-della-settimana), nel fuso del processo.

const CAMPI = [
    { nome: 'minuto', min: 0, max: 59 },
    { nome: 'ora', min: 0, max: 23 },
    { nome: 'giorno del mese', min: 1, max: 31 },
    { nome: 'mese', min: 1, max: 12 },
    { nome: 'giorno della settimana', min: 0, max: 7 }
];

const SCORCIATOIE = {
    '@hourly': '0 * * * *',
    '@daily': '0 0 * * *',
    '@weekly': '0 0 * * 0',
    '@monthly': '0 0 1 * *',
    '@ogni-ora': '0 * * * *',
    '@ogni-giorno': '0 0 * * *',
    '@ogni-settimana': '0 0 * * 1',
    '@ogni-mese': '0 0 1 * *'
};

const ORIZZONTE_MS = 5 * 366 * 24 * 60 * 60 * 1000;

function erroreEspressione(espressione, dettaglio) {
    return new Error(`Espressione di pianificazione non valida "${espressione}": ${dettaglio}`);
}

function espandiCampo(testo, campo, espressione) {
    const valori = new Set();
    for (const parte of testo.split(',')) {
        const trovato = parte.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
        if (!trovato) throw erroreEspressione(espressione, `${campo.nome} "${parte}"`);
        const passo = trovato[2] ? Number(trovato[2]) : 1;
        let inizio;
        let fine;
        if (trovato[1] === '*') {
            inizio = campo.min;
            fine = campo.max;
        } else {
            [inizio, fine] = trovato[1].split('-').map(Number);
            if (fine === undefined) fine = trovato[2] ? campo.max : inizio;
        }
        if (passo < 1 || inizio < campo.min || fine > campo.max || inizio > fine) {
            throw erroreEspressione(espressione, `${campo.nome} "${parte}" fuori dall'intervallo ${campo.min}-${campo.max}`);
        }
        for (let valore = inizio; valore <= fine; valore += passo) valori.add(valore);
    }
    return valori;
}

function analizza(espressione) {
    const testo = String(espressione || '').trim();
    const normale = SCORCIATOIE[testo.toLowerCase()] || testo;
    const pezzi = normale.split(/\s+/);
    if (pezzi.length !== 5) {
        throw erroreEspressione(testo, 'servono 5 campi: minuto ora giorno mese giorno-della-settimana');
    }
    const [minuti, ore, giorni, mesi, settimana] = pezzi.map((pezzo, indice) => espandiCampo(pezzo, CAMPI[indice], testo));
    if (settimana.has(7)) {
        settimana.delete(7);
        settimana.add(0);
    }
    return {
        espressione: testo,
        minuti,
        ore,
        giorni,
        mesi,
        settimana,
        giornoLibero: pezzi[2] === '*',
        settimanaLibera: pezzi[4] === '*'
    };
}

function giornoCorrisponde(piano, data) {
    const delMese = piano.giorni.has(data.getDate());
    const dellaSettimana = piano.settimana.has(data.getDay());
    if (piano.giornoLibero && piano.settimanaLibera) return true;
    if (piano.giornoLibero) return dellaSettimana;
    if (piano.settimanaLibera) return delMese;
    return delMese || dellaSettimana;
}

function corrisponde(piano, data) {
    return piano.minuti.has(data.getMinutes())
        && piano.ore.has(data.getHours())
        && piano.mesi.has(data.getMonth() + 1)
        && giornoCorrisponde(piano, data);
}

function prossimaEsecuzione(espressione, da = new Date()) {
    const piano = typeof espressione === 'string' ? analizza(espressione) : espressione;
    const cursore = new Date(da.getTime());
    cursore.setSeconds(0, 0);
    cursore.setMinutes(cursore.getMinutes() + 1);
    const limite = da.getTime() + ORIZZONTE_MS;
    while (cursore.getTime() <= limite) {
        if (!piano.mesi.has(cursore.getMonth() + 1)) {
            cursore.setMonth(cursore.getMonth() + 1, 1);
            cursore.setHours(0, 0, 0, 0);
        } else if (!giornoCorrisponde(piano, cursore)) {
            cursore.setDate(cursore.getDate() + 1);
            cursore.setHours(0, 0, 0, 0);
        } else if (!piano.ore.has(cursore.getHours())) {
            cursore.setHours(cursore.getHours() + 1, 0, 0, 0);
        } else if (!piano.minuti.has(cursore.getMinutes())) {
            cursore.setMinutes(cursore.getMinutes() + 1, 0, 0);
        } else {
            return new Date(cursore.getTime());
        }
    }
    return null;
}

function registraErroreDiSistema(appId, nome, errore) {
    try {
        require('../../observability/logger').error(`[Pianificatore] ${appId}/${nome} non riuscito`, { app: appId, lavoro: nome, errore: errore && errore.message });
    } catch (erroreLog) {
        console.error('[Pianificatore]', appId, nome, errore, erroreLog);
    }
}

class Pianificatore {
    constructor({ adesso = () => new Date(), registraErrore = registraErroreDiSistema } = {}) {
        this._adesso = adesso;
        this._registraErrore = registraErrore;
        this._lavori = new Map();
        this._timer = null;
    }

    pianifica(appId, nome, espressione, funzione) {
        if (!appId || !nome) throw new Error('Una pianificazione richiede applicazione e nome');
        if (typeof funzione !== 'function') throw new Error('Una pianificazione richiede una funzione da eseguire');
        const piano = analizza(espressione);
        this._lavori.set(`${appId}::${nome}`, {
            appId,
            nome,
            piano,
            funzione,
            inEsecuzione: false,
            ultimaEsecuzione: null,
            ultimoErrore: null
        });
        this._avvia();
        return { nome, prossima: prossimaEsecuzione(piano, this._adesso()) };
    }

    annulla(appId, nome) {
        const rimosso = this._lavori.delete(`${appId}::${nome}`);
        this._fermaSeVuoto();
        return rimosso;
    }

    annullaTutti(appId) {
        let rimossi = 0;
        for (const [chiave, lavoro] of this._lavori) {
            if (lavoro.appId === appId) {
                this._lavori.delete(chiave);
                rimossi++;
            }
        }
        this._fermaSeVuoto();
        return rimossi;
    }

    elenco(appId) {
        const adesso = this._adesso();
        return Array.from(this._lavori.values())
            .filter(lavoro => !appId || lavoro.appId === appId)
            .map(lavoro => ({
                appId: lavoro.appId,
                nome: lavoro.nome,
                espressione: lavoro.piano.espressione,
                inEsecuzione: lavoro.inEsecuzione,
                ultimaEsecuzione: lavoro.ultimaEsecuzione,
                ultimoErrore: lavoro.ultimoErrore,
                prossima: prossimaEsecuzione(lavoro.piano, adesso)
            }));
    }

    async esegui(minuto) {
        const avviati = [];
        for (const lavoro of this._lavori.values()) {
            if (lavoro.inEsecuzione || !corrisponde(lavoro.piano, minuto)) continue;
            avviati.push(this._eseguiLavoro(lavoro, minuto));
        }
        await Promise.all(avviati);
        return avviati.length;
    }

    async _eseguiLavoro(lavoro, minuto) {
        lavoro.inEsecuzione = true;
        try {
            await lavoro.funzione({ nome: lavoro.nome, pianificatoPer: minuto });
            lavoro.ultimoErrore = null;
        } catch (errore) {
            lavoro.ultimoErrore = errore && errore.message ? errore.message : String(errore);
            this._registraErrore(lavoro.appId, lavoro.nome, errore);
        } finally {
            lavoro.inEsecuzione = false;
            lavoro.ultimaEsecuzione = Date.now();
        }
    }

    _avvia() {
        if (!this._timer) this._programma();
    }

    _programma() {
        const adesso = this._adesso();
        const attesa = 60000 - (adesso.getSeconds() * 1000 + adesso.getMilliseconds()) + 50;
        this._timer = setTimeout(() => {
            this._timer = null;
            const minuto = this._adesso();
            minuto.setSeconds(0, 0);
            this.esegui(minuto).catch(errore => this._registraErrore('kernel', 'ciclo', errore));
            if (this._lavori.size > 0) this._programma();
        }, attesa);
        if (typeof this._timer.unref === 'function') this._timer.unref();
    }

    _fermaSeVuoto() {
        if (this._lavori.size === 0 && this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }
}

module.exports = {
    analizza,
    corrisponde,
    prossimaEsecuzione,
    Pianificatore,
    pianificatore: new Pianificatore()
};
