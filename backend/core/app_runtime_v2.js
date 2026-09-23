'use strict';

// Scheletro del backend per le app v2. L'app scrive solo le proprie azioni:
// ruoli, validazione, risposta, salvataggio dell'archivio e contesto utente li gestisce il core.

const crypto = require('crypto');
const changeCapture = require('./change_capture');
const fieldAudit = require('./field_audit');
const contestoOperazione = require('./operation_context/contesto_operazione');

const NOME_AZIONE = /^[A-Za-z][\w.-]{0,79}$/;

class ErroreApp extends Error {
    constructor(messaggio, codice = 'ERRORE_APP') {
        super(messaggio);
        this.name = 'ErroreApp';
        this.codice = codice;
    }
}

const CF_DISPARI = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };

function codiceFiscaleValido(valore) {
    const cf = String(valore || '').trim().toUpperCase();
    if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) return false;
    let somma = 0;
    for (let i = 0; i < 15; i++) {
        const c = cf[i];
        if (i % 2 === 0) somma += CF_DISPARI[c];
        else somma += /[0-9]/.test(c) ? Number(c) : c.charCodeAt(0) - 65;
    }
    return String.fromCharCode(65 + (somma % 26)) === cf[15];
}

const CONTROLLI = {
    testo: v => typeof v === 'string',
    numero: v => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v)),
    intero: v => Number.isInteger(Number(v)) && String(v).trim() !== '',
    booleano: v => typeof v === 'boolean' || v === 0 || v === 1,
    data: v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
    dataOra: v => typeof v === 'string' && !Number.isNaN(Date.parse(v)),
    email: v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    id: v => (typeof v === 'string' && v.length > 0 && v.length <= 100) || Number.isInteger(v),
    elenco: v => Array.isArray(v),
    oggetto: v => v !== null && typeof v === 'object' && !Array.isArray(v),
    codiceFiscale: codiceFiscaleValido
};

function regolaDi(regola) {
    if (typeof regola === 'string') {
        return { tipo: regola.replace(/!$/, ''), obbligatorio: regola.endsWith('!') };
    }
    return regola || {};
}

function validaPayload(schema, payload) {
    const dati = payload && typeof payload === 'object' ? payload : {};
    const errori = [];
    for (const [campo, grezza] of Object.entries(schema)) {
        const regola = regolaDi(grezza);
        const valore = dati[campo];
        if (valore === undefined || valore === null || valore === '') {
            if (regola.obbligatorio) errori.push(`"${campo}" e obbligatorio`);
            continue;
        }
        const controllo = CONTROLLI[regola.tipo];
        if (!controllo(valore)) errori.push(`"${campo}" non e un valore di tipo ${regola.tipo}`);
        else if (regola.max !== undefined && typeof valore === 'string' && valore.length > regola.max) errori.push(`"${campo}" supera ${regola.max} caratteri`);
        else if (Array.isArray(regola.valori) && !regola.valori.includes(valore)) errori.push(`"${campo}" deve essere uno fra: ${regola.valori.join(', ')}`);
    }
    return errori;
}

function verificaSchema(nome, schema) {
    for (const [campo, grezza] of Object.entries(schema)) {
        const regola = regolaDi(grezza);
        if (!CONTROLLI[regola.tipo]) {
            throw new Error(`Azione "${nome}": tipo "${regola.tipo}" sconosciuto per "${campo}" (ammessi: ${Object.keys(CONTROLLI).join(', ')})`);
        }
    }
}

function archivioDi(dbManager, namespace) {
    const archivio = dbManager.get(namespace);
    if (!archivio) throw new ErroreApp("Archivio dell'app non disponibile: apri una rete", 'ARCHIVIO_ASSENTE');
    return archivio;
}

function creaArchivio(namespace, dbManager, replicaFn) {
    const handle = () => archivioDi(dbManager, namespace);

    const traccia = (funzione) => {
        const archivio = handle();
        fieldAudit.prepara(archivio);
        const { risultato, cambi } = changeCapture.traccia(
            archivio,
            funzione,
            elenco => fieldAudit.registra(archivio, elenco, contestoOperazione.operatore())
        );
        changeCapture.inoltra(archivio, cambi, replicaFn);
        return risultato;
    };

    return Object.freeze({
        tutti: (sql, parametri = []) => handle().query(sql, parametri),
        uno: (sql, parametri = []) => handle().query(sql, parametri)[0] || null,
        esegui: (sql, parametri = []) => traccia(archivio => archivio.run(sql, parametri)),
        transazione: funzione => traccia(() => funzione()),
        nuovoId: () => crypto.randomUUID(),
        adesso: () => new Date().toISOString(),
        salva: () => dbManager.save(namespace)
    });
}

const archivioAssente = new Proxy({}, {
    get: () => () => {
        throw new ErroreApp('Questa app non dichiara "data" nel manifest', 'ARCHIVIO_NON_DICHIARATO');
    }
});

function crea(manifest, dipendenze = {}) {
    const appId = manifest.id;
    const nomeApp = manifest.name || appId;
    const branchManager = require('../dag/application/branch_manager');
    const baseNamespace = (manifest.db && manifest.db.namespace) || (manifest.data && (manifest.data.namespace || manifest.id)) || null;
    
    let namespace = baseNamespace;
    if (baseNamespace && branchManager.getCurrentBranch() !== 'main') {
        namespace = `${baseNamespace}_${branchManager.getCurrentBranch()}`;
    }

    const kernel = dipendenze.kernel;
    const dbManager = dipendenze.dbManager || require('./AppDbManager');
    const permessiUtente = dipendenze.permessiUtente
        || (userId => require('../handlers/rbac').getEffectiveUserPermissions(null, userId));
    const broker = () => dipendenze.broker || require('../security/capabilityBroker');
    const ruoliDichiarati = (manifest.rbacPermissions || manifest.roles || []).map(r => r.id);
    const ruoliPredefiniti = (manifest.rbacPermissions || manifest.roles || [])
        .filter(r => r.default === true)
        .map(r => r.id);
    const azioni = new Map();
    if (namespace) {
        fieldAudit.azioniDiSistema({
            archivio: () => archivioDi(dbManager, namespace),
            ruoliDichiarati,
            ErroreApp,
            ...(dipendenze.risolviNomiOperatori ? { risolviNomi: dipendenze.risolviNomiOperatori } : {})
        }).forEach(([nome, voce]) => azioni.set(nome, voce));
    }

    function azione(nome, opzioni, funzione) {
        if (typeof opzioni === 'function') {
            funzione = opzioni;
            opzioni = {};
        }
        if (!NOME_AZIONE.test(String(nome || ''))) throw new Error(`Nome di azione non valido: ${JSON.stringify(nome)}`);
        if (fieldAudit.nomeRiservato(nome)) throw new Error(`Azione "${nome}": il prefisso "koradest." e riservato al core`);
        if (azioni.has(nome)) throw new Error(`Azione "${nome}" registrata due volte`);
        if (typeof funzione !== 'function') throw new Error(`Azione "${nome}" senza funzione`);
        const ruoli = opzioni.ruolo === undefined ? [] : [].concat(opzioni.ruolo);
        ruoli.filter(r => !ruoliDichiarati.includes(r)).forEach((r) => {
            throw new Error(`Azione "${nome}": il ruolo "${r}" non e dichiarato in "roles" del manifest`);
        });
        if (opzioni.valida) verificaSchema(nome, opzioni.valida);
        azioni.set(nome, { funzione, ruoli, valida: opzioni.valida || null, modifica: opzioni.modifica === true, descrizione: typeof opzioni.descrizione === 'string' ? opzioni.descrizione.slice(0, 500) : null });
    }

    function contestoPer(sourceAppId, contesto) {
        const userId = contesto && contesto.userId ? contesto.userId : null;
        const permessi = userId ? (permessiUtente(userId) || []) : [];
        const tutti = permessi.includes('*') || permessi.includes(`${appId}:*`);
        const accedeAllApp = tutti || permessi.some(permesso => permesso.startsWith(`${appId}:`));
        const ruoli = ruoliDichiarati.filter(r => tutti || (accedeAllApp && ruoliPredefiniti.includes(r)) || permessi.includes(`${appId}:${r}`));
        return Object.freeze({
            utente: userId ? { id: userId } : null,
            ruoli,
            haRuolo: ruolo => ruoli.includes(ruolo),
            chiamante: sourceAppId,
            chiama: (altraApp, nomeAzione, dati = {}) =>
                broker().routeIpcCall(appId, altraApp, nomeAzione, dati, { origin: 'ipc', contesto: userId ? { userId } : null })
        });
    }

    async function esegui(nome, sourceAppId, payload, contesto) {
        const voce = azioni.get(nome);
        const ctx = contestoPer(sourceAppId, contesto);
        if (voce.ruoli.length > 0 && !voce.ruoli.some(ctx.haRuolo)) {
            throw new ErroreApp(`Per questa operazione serve il ruolo "${voce.ruoli.join('" oppure "')}" in ${nomeApp}`, 'RUOLO_MANCANTE');
        }
        if (voce.valida) {
            const errori = validaPayload(voce.valida, payload);
            if (errori.length > 0) throw new ErroreApp(`Dati non validi: ${errori.join('; ')}`, 'DATI_NON_VALIDI');
        }
        try {
            const dati = payload && typeof payload === 'object' ? payload : {};
            const risultato = await contestoOperazione.esegui(
                { operatoreId: ctx.utente ? ctx.utente.id : null, app: appId, azione: nome },
                () => voce.funzione(dati, ctx)
            );
            if (voce.modifica && namespace) await dbManager.save(namespace);
            return risultato === undefined ? null : risultato;
        } catch (errore) {
            if (!(errore instanceof ErroreApp) && kernel && kernel.log) {
                kernel.log.error(`Azione "${nome}" non riuscita`, { errore: errore.message });
            }
            throw errore;
        }
    }

    const api = Object.freeze({
        app: Object.freeze({ id: appId, nome: nomeApp, versione: manifest.version || null }),
        azione,
        db: namespace ? creaArchivio(namespace, dbManager, dipendenze.replica) : archivioAssente,
        kernel,
        replica: dipendenze.replica || (() => false),
        errore: (messaggio, codice) => {
            throw new ErroreApp(messaggio, codice);
        },
        ErroreApp
    });

    return {
        api,
        azioni: () => Array.from(azioni.keys()),
        descriviAzioni: () => Array.from(azioni.entries()).map(([nome, voce]) => ({ nome, ruoli: voce.ruoli, valida: voce.valida, modifica: voce.modifica, descrizione: voce.descrizione || null })),
        ruoliPredefiniti,
        esegui,
        registraNelBroker: (capabilityBroker, aliases = []) => {
            const targets = Array.from(new Set([appId, ...(Array.isArray(aliases) ? aliases : [])]));
            for (const target of targets) {
                for (const nome of azioni.keys()) {
                    capabilityBroker.registerApiHandler(target, nome, (sourceAppId, payload, contesto) => esegui(nome, sourceAppId, payload, contesto));
                }
            }
        }
    };
}

module.exports = { crea, validaPayload, ErroreApp };
