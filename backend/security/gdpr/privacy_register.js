'use strict';

const TRATTAMENTI = [
    {
        id: 'gestione_utenti',
        finalita: 'Autenticazione e controllo degli accessi alla postazione e alla rete',
        baseGiuridica: 'Esecuzione del contratto e legittimo interesse del titolare alla sicurezza dei sistemi',
        categorieInteressati: ['Dipendenti', 'Collaboratori', 'Amministratori di sistema'],
        categorieDati: ['Nome e cognome', 'Indirizzo email', 'Credenziali cifrate', 'Fattori di autenticazione a due fattori'],
        tabelle: ['users', 'webauthn_credentials', 'totp_backup_codes'],
        conservazione: 'Finche l account e attivo; anonimizzazione alla cancellazione dell interessato'
    },
    {
        id: 'anagrafica_personale',
        finalita: 'Gestione anagrafica del personale e degli adempimenti connessi al rapporto di lavoro',
        baseGiuridica: 'Esecuzione del contratto di lavoro e obblighi di legge',
        categorieInteressati: ['Dipendenti', 'Familiari dei dipendenti'],
        categorieDati: ['Dati identificativi', 'Codice fiscale', 'Documenti di identita', 'Residenza e domicilio', 'Titoli di studio', 'Rapporti di lavoro'],
        tabelle: ['persone', 'documenti_identita', 'indirizzi', 'titoli_studio', 'rapporti_lavoro', 'familiari', 'contatti'],
        conservazione: 'Durata del rapporto piu i termini di legge applicabili'
    },
    {
        id: 'dati_bancari',
        finalita: 'Erogazione delle retribuzioni e dei rimborsi',
        baseGiuridica: 'Esecuzione del contratto di lavoro',
        categorieInteressati: ['Dipendenti', 'Collaboratori'],
        categorieDati: ['IBAN', 'Intestatario del conto', 'Istituto di credito'],
        tabelle: ['dati_bancari'],
        conservazione: 'Durata del rapporto piu i termini di legge applicabili'
    },
    {
        id: 'registro_accessi',
        finalita: 'Tracciamento degli accessi per finalita di sicurezza informatica',
        baseGiuridica: 'Legittimo interesse del titolare alla sicurezza dei sistemi',
        categorieInteressati: ['Utenti della rete'],
        categorieDati: ['Identificativo utente', 'Indirizzo IP', 'Nome del nodo', 'Data e ora', 'Esito dell accesso'],
        tabelle: ['access_logs'],
        conservazione: 'Definita dalla politica di conservazione configurata nella rete'
    },
    {
        id: 'audit',
        finalita: 'Tracciamento delle operazioni amministrative e delle richieste degli interessati',
        baseGiuridica: 'Obbligo di legge, principio di responsabilizzazione',
        categorieInteressati: ['Amministratori', 'Interessati che esercitano i propri diritti'],
        categorieDati: ['Identificativo operatore', 'Operazione eseguita', 'Oggetto e data'],
        tabelle: ['audit_log'],
        conservazione: 'Definita dalla politica di conservazione configurata nella rete'
    }
];

const MISURE_TECNICHE = [
    'Archivi cifrati con AES-256-GCM; la chiave deriva dal codice di rete e non e mai memorizzata in chiaro',
    'Ogni rete ha uno spazio dati isolato: il codice di una rete non apre l archivio di un altra',
    'Controllo degli accessi applicato su tutti i canali interni, con rifiuto predefinito',
    'Autenticazione rafforzata per le operazioni critiche come la rivelazione del codice di rete e la cancellazione di un interessato',
    'Cancellazione crittografica dei dati personali nel registro distribuito, replicata su tutti i nodi',
    'Copie di sicurezza cifrate con verifica di integrita tramite impronta SHA-256',
    'Comunicazioni fra nodi limitate alla rete di appartenenza tramite identificativo pubblico derivato',
    'Nessuna risorsa remota caricata dall interfaccia: nessun trasferimento di dati verso servizi terzi'
];

const DIRITTI = [
    { diritto: 'Accesso e portabilita', supporto: 'Esportazione completa dei dati di un interessato in formato JSON' },
    { diritto: 'Cancellazione', supporto: 'Cancellazione delle righe, anonimizzazione dell account e cancellazione crittografica nel registro distribuito' },
    { diritto: 'Rettifica', supporto: 'Modifica dai moduli di anagrafica, tracciata nel registro delle modifiche' },
    { diritto: 'Limitazione', supporto: 'Disattivazione dell account senza cancellazione dei dati' }
];

const LIMITI_NOTI = [
    'La cancellazione crittografica agisce sui nodi che ricevono l istruzione: un nodo rimosso dalla rete prima della richiesta conserva la propria copia.',
    'Le copie di sicurezza esportate manualmente prima di una cancellazione non vengono raggiunte dall istruzione e vanno distrutte dal titolare.'
];

const DOMINI_AUTH = ['users', 'webauthn_credentials', 'totp_backup_codes', 'access_logs', 'notifications', 'distributed_logs'];

function _dominioDi(tabella) {
    if (DOMINI_AUTH.includes(tabella)) return 'auth';
    if (tabella === 'audit_log') return 'audit';
    return 'app_anagrafica';
}

function _conteggio(tabella) {
    try {
        const righe = require('../../db').getDB(_dominioDi(tabella)).query(`SELECT COUNT(*) AS totale FROM ${tabella}`);
        return righe && righe.length > 0 ? Number(righe[0].totale) || 0 : 0;
    } catch (_) {
        return null;
    }
}

function generaRegistro() {
    const descrittore = require('../../networks/session/network_session').descriptor();
    let conservazione = null;
    try {
        conservazione = require('./retention_runner').getPolicy();
    } catch (_) {}
    return {
        success: true,
        generatoIl: new Date().toISOString(),
        rete: descrittore ? { nome: descrittore.name, identificativo: descrittore.publicId } : null,
        avvertenza: 'Documento generato automaticamente dallo stato del sistema. Va completato con i dati del titolare del trattamento, del responsabile della protezione dei dati e degli eventuali responsabili esterni, e riesaminato periodicamente.',
        trattamenti: TRATTAMENTI.map(t => ({
            ...t,
            volumi: Object.fromEntries(t.tabelle.map(tabella => [tabella, _conteggio(tabella)]))
        })),
        conservazione,
        misureTecniche: MISURE_TECNICHE,
        dirittiSupportati: DIRITTI,
        limitiNoti: LIMITI_NOTI
    };
}

function comeMarkdown(registro) {
    const righe = ['# Registro dei trattamenti', ''];
    righe.push(`Generato il ${new Date(registro.generatoIl).toLocaleString('it-IT')}`);
    if (registro.rete) righe.push(`Rete: ${registro.rete.nome}`);
    righe.push('', `> ${registro.avvertenza}`, '');
    for (const t of registro.trattamenti) {
        righe.push(`## ${t.finalita}`, '');
        righe.push(`- Base giuridica: ${t.baseGiuridica}`);
        righe.push(`- Categorie di interessati: ${t.categorieInteressati.join(', ')}`);
        righe.push(`- Categorie di dati: ${t.categorieDati.join(', ')}`);
        righe.push(`- Conservazione: ${t.conservazione}`);
        const volumi = Object.entries(t.volumi)
            .map(([tabella, totale]) => `${tabella} (${totale === null ? 'non disponibile' : totale} record)`)
            .join(', ');
        righe.push(`- Archivi: ${volumi}`, '');
    }
    righe.push('## Misure tecniche', '');
    for (const misura of registro.misureTecniche) righe.push(`- ${misura}`);
    righe.push('', '## Diritti degli interessati', '');
    for (const d of registro.dirittiSupportati) righe.push(`- ${d.diritto}: ${d.supporto}`);
    righe.push('', '## Limiti noti', '');
    for (const limite of registro.limitiNoti) righe.push(`- ${limite}`);
    righe.push('');
    return righe.join('\n');
}

module.exports = { generaRegistro, comeMarkdown, TRATTAMENTI, MISURE_TECNICHE, DIRITTI, LIMITI_NOTI };
