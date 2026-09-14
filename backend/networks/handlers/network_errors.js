'use strict';

const MESSAGES = {
    NETWORK_NOT_FOUND: 'Rete non presente su questa postazione.',
    NETWORK_CODE_INVALID: 'Il codice di rete inserito non e valido.',
    NETWORK_CODE_REQUIRED: 'Inserisci il codice di questa rete per accedere.',
    NETWORK_CODE_MISMATCH: 'Codice di rete errato.',
    NETWORK_NAME_INVALID: 'Il nome della rete non e valido.',
    NETWORK_ALREADY_REGISTERED: 'Questa rete e gia presente sulla postazione.',
    NETWORK_VAULT_WRITE_FAILED: 'Impossibile salvare il registro delle reti.',
    NETWORK_SEAL_UNAVAILABLE: 'Questo sistema non consente di memorizzare il codice in modo sicuro.',
    NETWORK_SLUG_INVALID: 'Spazio di lavoro della rete non valido.',
    NETWORK_PATH_OUT_OF_SCOPE: 'Percorso dati della rete non consentito.',
    NETWORK_KEY_INVALID: 'Chiave di cifratura della rete non valida.',
    NETWORK_NOT_ACTIVE: 'Nessuna rete attiva su questa postazione.',
    QUORUM_MIN_NODES_INVALID: 'Il numero minimo di nodi deve essere compreso tra 1 e 64.',
    QUORUM_ENFORCEMENT_INVALID: 'Modalita di applicazione del quorum non valida.',
    QUORUM_GRACE_INVALID: 'La tolleranza di riallineamento deve essere compresa tra 0 e 60 minuti.',
    QUORUM_NOT_REACHED: 'Numero di nodi collegati insufficiente per accedere a questa rete.',
    FORBIDDEN: 'Operazione riservata agli amministratori della rete.',
    STEP_UP_NO_SESSION: 'Nessuna sessione attiva.',
    STEP_UP_CREDENTIAL_REQUIRED: 'Inserisci il tuo PIN o la tua password per confermare.',
    STEP_UP_LOCKED: 'Troppi tentativi falliti. Riprova tra qualche istante.',
    STEP_UP_INVALID: 'PIN o password non corretti.',
    RECOVERY_TOTAL_INVALID: 'Il numero di quote deve essere compreso tra 2 e 12.',
    RECOVERY_THRESHOLD_INVALID: 'Le quote necessarie non possono superare il numero di quote generate.',
    RECOVERY_NOT_ENOUGH_SHARES: 'Servono almeno due quote valide per il recupero.',
    RECOVERY_SHARES_MIXED: 'Le quote inserite appartengono a reti diverse.',
    RECOVERY_SHARES_INSUFFICIENT: 'Le quote inserite non bastano a ricostruire il codice: servono quelle indicate nel kit.',
    EXPORT_DESTINATION_MISSING: 'Nessuna cartella di destinazione selezionata.',
    EXPORT_SOURCE_MISSING: 'Archivio della rete non trovato su questa postazione.',
    EXPORT_NOTHING_TO_COPY: 'Non ci sono archivi da copiare.',
    EXPORT_MANIFEST_MISSING: 'La cartella selezionata non contiene una copia di sicurezza Koradest.'
};

function toResponse(error) {
    const code = error && error.isExpected ? error.message : 'NETWORK_UNEXPECTED';
    if (!error || !error.isExpected) {
        console.error('[Networks] Errore non gestito:', error && error.message);
    }
    return {
        success: false,
        code,
        error: MESSAGES[code] || 'Operazione non riuscita.'
    };
}

module.exports = { MESSAGES, toResponse };
