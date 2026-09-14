const IMPORTI = [5, 10, 25, 50];

const PROMESSE = [
    ['all_inclusive', 'Nessun canone, mai'],
    ['devices', 'Nodi e utenti illimitati'],
    ['lock_open_right', 'Nessuna funzione a pagamento']
];

const GARANZIE = [
    ['&euro; 0', 'di canone', 'payments'],
    ['AES-256', 'sugli archivi', 'enhanced_encryption'],
    ['0 byte', 'inviati a noi', 'cloud_off'],
    ['SHA-256', 'sul registro accessi', 'fingerprint']
];

const PIATTAFORMA = [
    ['hub', 'Un unico contenitore', 'KORADEST ospita le applicazioni gestionali del tuo lavoro sotto un solo accesso, con un solo elenco utenti.'],
    ['admin_panel_settings', 'Permessi per persona', 'Decidi chi vede cosa: ogni applicazione espone i propri permessi e tu li assegni a ruoli e persone.'],
    ['lan', 'Nodi in rete locale', 'Piu computer dello studio o dell\'ufficio lavorano insieme sulla rete interna, senza passare da internet.'],
    ['extension', 'Applicazioni installabili', 'Lo Store installa solo cio che scegli tu: ogni app ha il proprio archivio e i propri permessi.']
];

const SICUREZZA = [
    ['home_storage', 'I dati restano sui tuoi computer', 'Gli archivi sono file sul nodo che li ospita. Non esiste un nostro server che li riceve o li conserva.'],
    ['enhanced_encryption', 'Archivi cifrati sul disco', 'Ogni archivio e salvato cifrato con AES-256-GCM. La chiave nasce dal codice di rete tramite scrypt e viene custodita dal sistema operativo, legata al tuo utente Windows: copiare i file su un altro computer non basta per leggerli.'],
    ['cloud_off', 'Nessun account nostro, nessuna nuvola', 'Gli utenti li crei tu dentro KORADEST: non esiste una registrazione da fare presso di noi.'],
    ['analytics', 'Nessuna telemetria', 'Non raccogliamo statistiche di utilizzo e non tracciamo cosa fai nel programma.'],
    ['fingerprint', 'Registro accessi verificabile', 'Gli accessi vengono annotati in un registro concatenato con impronte SHA-256: una riga modificata a posteriori spezza la catena e si vede.']
];

const RESPONSABILITA = [
    'Custodisci il codice di rete: e la radice della chiave di cifratura, e chi lo conosce puo aprire gli archivi.',
    'Tieni un backup degli archivi su un supporto diverso dal computer che li contiene: i backup restano cifrati.',
    'Dai a ogni persona il proprio utente e non lasciare sessioni aperte su postazioni incustodite.',
    'Cifrare anche il disco con BitLocker aggiunge una seconda barriera oltre a quella di KORADEST.',
    'Il titolare del trattamento dei dati resta la tua organizzazione: KORADEST e uno strumento, non un adempimento.'
];

function voce([simbolo, titolo, testo]) {
    return `
        <li class="info-voce">
            <span class="info-voce__icona"><span class="material-symbols-rounded">${simbolo}</span></span>
            <div>
                <strong>${titolo}</strong>
                <span class="info-voce__testo">${testo}</span>
            </div>
        </li>`;
}

function garanzia([valore, etichetta, simbolo]) {
    return `
        <li class="info-garanzia">
            <span class="info-garanzia__icona"><span class="material-symbols-rounded">${simbolo}</span></span>
            <strong class="info-garanzia__valore">${valore}</strong>
            <span class="info-garanzia__eti">${etichetta}</span>
        </li>`;
}

export function eroeHtml(paypal) {
    return `
        <header class="info-eroe" data-rivela>
            <div class="info-eroe__alone"></div>
            <div class="info-eroe__corpo">
                <span class="info-occhiello"><span class="material-symbols-rounded">verified</span>Piattaforma gestionale libera</span>
                <h1 class="info-titolo">KORADEST e gratuito. E resta gratuito.</h1>
                <p class="info-sommario">Nessuna licenza da rinnovare, nessun limite nascosto, nessun dato della tua
                organizzazione su server altrui. Se ti e utile, puoi contribuire tu a mantenerlo vivo.</p>
                <ul class="info-promesse">
                    ${PROMESSE.map(([s, t]) => `<li class="info-promessa"><span class="material-symbols-rounded">${s}</span>${t}</li>`).join('')}
                </ul>
            </div>
            <div class="info-dona">
                <div class="info-dona__testa">
                    <span class="info-dona__icona"><span class="material-symbols-rounded">volunteer_activism</span></span>
                    <div>
                        <h2 class="info-dona__titolo">Sostieni il progetto</h2>
                        <p class="info-dona__sottotitolo">Sviluppo, aggiornamenti e assistenza li porto avanti da solo. Una donazione libera li tiene in vita.</p>
                    </div>
                </div>
                <div class="info-importi">
                    ${IMPORTI.map(v => `<button type="button" class="info-importo" data-esterno="${paypal}/${v}">${v} &euro;</button>`).join('')}
                </div>
                <button type="button" class="info-azione" data-esterno="${paypal}">
                    <span class="material-symbols-rounded">favorite</span>Dona ora
                </button>
                <p class="info-dona__nota"><span class="material-symbols-rounded">shield</span>
                Il pagamento avviene su PayPal. KORADEST non vede ne conserva alcun dato di pagamento.</p>
            </div>
        </header>`;
}

export function garanzieHtml() {
    return `<ul class="info-garanzie" data-rivela>${GARANZIE.map(garanzia).join('')}</ul>`;
}

export function piattaformaHtml() {
    return `
        <section class="info-scheda" data-rivela>
            <header class="info-testa"><span class="material-symbols-rounded">grid_view</span><h2>Che cos'e KORADEST</h2></header>
            <p class="info-testo">KORADEST e la piattaforma che tiene insieme i gestionali del tuo lavoro: un solo accesso,
            un solo elenco di persone e permessi, e le applicazioni che scegli tu.</p>
            <ul class="info-voci">${PIATTAFORMA.map(voce).join('')}</ul>
        </section>`;
}

export function sicurezzaHtml() {
    return `
        <section class="info-scheda" data-rivela>
            <header class="info-testa"><span class="material-symbols-rounded">shield_lock</span><h2>I dati non escono da qui</h2></header>
            <ul class="info-voci">${SICUREZZA.map(voce).join('')}</ul>
            <p class="info-minuto">L'unica cosa che passa da internet e l'aggiornamento dei programmi, scaricato da
            nunziotech.it. In quel pacchetto c'e solo software: nessun dato tuo viene mai inviato.</p>
        </section>`;
}

export function responsabilitaHtml() {
    return `
        <section class="info-scheda info-scheda--avviso" data-rivela>
            <header class="info-testa"><span class="material-symbols-rounded">info</span><h2>Quello che resta a carico tuo</h2></header>
            <p class="info-testo">Preferisco dirti anche cosa KORADEST non fa, invece di lasciartelo scoprire dopo.
            Gli archivi sono cifrati, ma nessuna cifratura protegge da una chiave lasciata in giro.</p>
            <ul class="info-responsabilita">
                ${RESPONSABILITA.map(t => `<li><span class="material-symbols-rounded">chevron_right</span><span>${t}</span></li>`).join('')}
            </ul>
        </section>`;
}

export function autoreHtml(email, sito) {
    return `
        <section class="info-scheda" data-rivela>
            <header class="info-testa"><span class="material-symbols-rounded">waving_hand</span><h2>Chi sono</h2></header>
            <p class="info-testo">Mi chiamo Nunzio Aprile e sviluppo software con il marchio NunzioTech. KORADEST nasce
            da un'idea semplice: chi lavora non dovrebbe pagare un canone per tenere in ordine i propri dati.</p>
            <p class="info-testo">Lo scrivo e lo mantengo da solo, ascoltando chi lo usa tutti i giorni. Ogni
            segnalazione che mi arriva finisce in una versione successiva.</p>
            <div class="info-azioni">
                <button type="button" class="info-azione info-azione--secondario" data-esterno="${email}">
                    <span class="material-symbols-rounded">mail</span>Scrivimi
                </button>
                <button type="button" class="info-azione info-azione--secondario" data-esterno="${sito}">
                    <span class="material-symbols-rounded">language</span>nunziotech.it
                </button>
            </div>
            <dl class="info-contatti">
                <dt><span class="material-symbols-rounded">mail</span>Email</dt><dd>info@nunziotech.com</dd>
                <dt><span class="material-symbols-rounded">engineering</span>Sviluppo</dt><dd>NunzioTech</dd>
            </dl>
        </section>`;
}
