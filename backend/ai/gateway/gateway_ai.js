'use strict';

const crypto = require('crypto');
const { FORNITORI, MODELLO_CONSIGLIATO } = require('./configurazione_ai');
const { creaSessione, istruzioniOperative } = require('./sessione_richiesta');

const LUNGHEZZA_MASSIMA_PROMPT = 8000;
const DURATA_CONFERMA_MS = 10 * 60 * 1000;
const MASSIMO_CONFERME = 20;
const MODELLO_VALIDO = /^[A-Za-z0-9._:\/-]{1,128}$/;

const riuscito = esito => !esito.limiteRaggiunto && esito.eseguiti.some(voce => voce.esito === 'ok')
    && esito.eseguiti.filter(voce => voce.esito === 'errore').every(errore => esito.eseguiti.some(voce => voce.esito === 'ok' && voce.nome === errore.nome));

function creaGateway({ configurazione, cassaforte, fornitori, hostOllama, toolRegistry, rbacGuard, dataProtector, broker, audit, apprendimento = null, scaricamenti = null, generaId = () => crypto.randomUUID() }) {
    const inAttesa = new Map();
    const dipendenze = { toolRegistry, rbacGuard, dataProtector, broker, audit, apprendimento };

    const istanzia = (nome, conf) => fornitori.crea(nome, {
        host: hostOllama(),
        chiave: nome === 'ollama' ? null : cassaforte.leggi(nome),
        timeoutMs: conf.timeoutMs,
        temperatura: conf.temperatura,
        contestoMassimo: conf.contestoMassimo,
        mantieniInMemoria: conf.mantieniInMemoria,
        modelloPredefinito: conf.modelli[nome]
    });

    const controllaFornitore = (nome) => {
        if (!FORNITORI.includes(nome)) throw new Error(`Fornitore AI non supportato: ${nome}`);
        return nome;
    };

    const pulisciScadute = () => [...inAttesa.entries()].filter(([, voce]) => voce.scadenza < Date.now()).forEach(([id]) => inAttesa.delete(id));

    function sospendi({ sessione, esito, utente, testo, conf, fornitore }) {
        pulisciScadute();
        while (inAttesa.size >= MASSIMO_CONFERME) inAttesa.delete(inAttesa.keys().next().value);
        const id = generaId();
        inAttesa.set(id, { utenteId: utente.id, sessione, stato: esito.stato, testo, conf, fornitore, scadenza: Date.now() + DURATA_CONFERMA_MS });
        audit(utente.id, 'AI_CONFIRMATION_REQUESTED', 'ai', esito.chiamata.nome, { fornitore: fornitore.nome }, 'SUCCESS');
        return {
            success: true,
            content: dataProtector.sanitizeModelOutput(([...esito.stato.conversazione].reverse().find(messaggio => messaggio.ruolo === 'assistente') || {}).testo || ''),
            inAttesa: { id, ...sessione.descrivi(esito.chiamata) },
            toolCallsExecuted: esito.eseguiti.length,
            fornitore: fornitore.nome
        };
    }

    function concludi({ sessione, esito, utente, testo, conf, fornitore }) {
        if (esito.sospeso) return sospendi({ sessione, esito, utente, testo, conf, fornitore });
        const idRisposta = conf.apprendimento && apprendimento
            ? apprendimento.concludi({ richiesta: testo, eseguiti: esito.eseguiti, riuscito: riuscito(esito), corretto: esito.corretto, strumentoNoto: sessione.strumentoNoto })
            : null;
        audit(utente.id, 'AI_ASSISTANT_QUERY', 'ai', fornitore.nome, { passi: esito.passi, strumenti: esito.eseguiti.length, strumentiOfferti: sessione.offerti(), limiteRaggiunto: esito.limiteRaggiunto, corretto: esito.corretto }, 'SUCCESS');
        return {
            success: true,
            content: dataProtector.sanitizeModelOutput(esito.testo),
            toolCallsExecuted: esito.eseguiti.length,
            passi: esito.passi,
            fornitore: fornitore.nome,
            idRisposta
        };
    }

    async function chiedi({ utente, prompt, sistema = '', appAttiva = null }) {
        const testo = String(prompt || '').trim();
        if (!testo) return { success: false, error: 'Scrivi una richiesta' };
        if (testo.length > LUNGHEZZA_MASSIMA_PROMPT) return { success: false, error: `La richiesta supera ${LUNGHEZZA_MASSIMA_PROMPT} caratteri` };
        const controllo = dataProtector.sanitizeInputPrompt(testo);
        if (!controllo.safe) return { success: false, error: controllo.error, blocked: true };

        const conf = configurazione.leggi();
        if (conf.jarvis === 'disattivo') return { success: false, error: 'Jarvis è disattivato: si riattiva da Amministratore › Server Ollama & AI' };
        const fornitore = istanzia(conf.fornitore, conf);
        const sessione = creaSessione({ conf, fornitore, utente, testo: controllo.text, sistema, appAttiva, dipendenze });
        const esito = await sessione.avvia();
        return concludi({ sessione, esito, utente, testo: controllo.text, conf, fornitore });
    }

    async function conferma({ utente, id, approvata }) {
        pulisciScadute();
        const voce = inAttesa.get(String(id || ''));
        if (!voce || voce.utenteId !== utente.id) return { success: false, error: 'Operazione da confermare non trovata o scaduta: ripeti la richiesta' };
        inAttesa.delete(String(id));
        const decisione = approvata === true;
        const chiamata = voce.stato.coda[0];
        audit(utente.id, decisione ? 'AI_CONFIRMATION_APPROVED' : 'AI_CONFIRMATION_REJECTED', 'ai', chiamata.nome, { fornitore: voce.fornitore.nome }, 'SUCCESS');
        if (voce.conf.apprendimento && apprendimento) apprendimento.registraConferma(decisione);
        const esito = await voce.sessione.riprendi(voce.stato, decisione);
        return concludi({ ...voce, esito, utente });
    }

    function valuta({ id, voto }) {
        if (!apprendimento) throw new Error('Apprendimento non disponibile');
        return apprendimento.valuta(id, voto);
    }

    function descrivi() {
        const conf = configurazione.leggi();
        return {
            ...conf,
            fornitoriDisponibili: FORNITORI,
            modelloConsigliato: MODELLO_CONSIGLIATO,
            chiavi: Object.fromEntries(FORNITORI.filter(nome => nome !== 'ollama').map(nome => [nome, cassaforte.descrivi(nome)]))
        };
    }

    async function stato(nome = null) {
        const conf = configurazione.leggi();
        const scelto = controllaFornitore(nome || conf.fornitore);
        return { fornitore: scelto, ...(await istanzia(scelto, conf).stato()) };
    }

    async function modelli(nome = null) {
        const conf = configurazione.leggi();
        return istanzia(controllaFornitore(nome || conf.fornitore), conf).modelli();
    }

    const ollama = () => {
        const conf = configurazione.leggi();
        return istanzia('ollama', conf);
    };

    const controllaModello = (nome) => {
        if (!MODELLO_VALIDO.test(String(nome || ''))) throw new Error('Nome del modello non valido');
        return String(nome);
    };

    async function capacitaModello(nome = null) {
        const modello = controllaModello(nome || configurazione.leggi().modelli.ollama);
        return { modello, ...(await ollama().capacita(modello)) };
    }

    function scaricaModello(nome) {
        if (!scaricamenti) throw new Error('Gestore degli scaricamenti non disponibile');
        const modello = controllaModello(nome);
        const fornitore = ollama();
        audit('sistema', 'AI_MODEL_DOWNLOAD', 'ai', 'ollama', { modello }, 'SUCCESS');
        return scaricamenti.avvia(`modello:${modello}`, {
            etichetta: modello,
            esegui: alProgresso => fornitore.scarica(modello, evento => alProgresso({ stato: evento.status, completati: evento.completed || 0, totale: evento.total || 0 }))
        });
    }

    async function memoria(azione) {
        const conf = configurazione.leggi();
        const fornitore = istanzia(conf.fornitore, conf);
        const esito = azione === 'carica' ? await fornitore.carica() : await fornitore.libera();
        audit('sistema', azione === 'carica' ? 'AI_MODEL_LOADED' : 'AI_MODEL_RELEASED', 'ai', conf.fornitore, { modello: conf.modelli[conf.fornitore] }, 'SUCCESS');
        return { fornitore: conf.fornitore, ...esito };
    }

    async function avvio() {
        const conf = configurazione.leggi();
        if (!conf.precaricaAllAvvio || conf.jarvis === 'disattivo') return { precaricato: false };
        await memoria('carica');
        return { precaricato: true };
    }

    function statoJarvis(puoDecidere) {
        const conf = configurazione.leggi();
        return {
            stato: conf.jarvis,
            puoDecidere: Boolean(puoDecidere),
            inviaContestoPagina: conf.inviaContestoPagina,
            ascoltoContinuo: conf.ascoltoContinuo,
            restaInAscoltoSecondi: conf.restaInAscoltoSecondi,
            variantiAttivazione: conf.variantiAttivazione,
            apprendimento: conf.apprendimento
        };
    }

    return Object.freeze({
        chiedi,
        conferma,
        valuta,
        descrivi,
        stato,
        modelli,
        capacitaModello,
        scaricaModello,
        annullaScaricamento: nome => (scaricamenti ? scaricamenti.annulla(`modello:${controllaModello(nome)}`) : { annullato: false }),
        memoria,
        avvio,
        statoJarvis,
        apprendimento: () => apprendimento,
        configura: modifiche => configurazione.aggiorna(modifiche),
        salvaChiave: (nome, chiave) => cassaforte.salva(controllaFornitore(nome), chiave),
        rimuoviChiave: nome => cassaforte.rimuovi(controllaFornitore(nome))
    });
}

module.exports = { creaGateway, istruzioniOperative };
