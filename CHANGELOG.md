# Changelog

Tutte le modifiche rilevanti di KORADEST sono documentate in questo file.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/).

## [1.1.23] - 2026-09-22

### Aggiunto
- **Assistente Jarvis e server Ollama**: nuovo modulo *Server Ollama & AI* in Amministratore per configurare host, modelli e parametri di un server LLM locale, con test di connessione. Jarvis è un assistente in finestra flottante, anche vocale, che legge il contesto della pagina aperta e usa come strumenti le azioni dichiarate nei manifest delle app installate, filtrate sui permessi di chi lo interroga. Prompt e risposte passano da un filtro che maschera i dati personali e blocca i tentativi di prompt injection; ogni domanda resta nel registro di audit.
- **Permessi dell'assistente**: la chat è disponibile a ogni utente autenticato; modificare la configurazione, provare la connessione ed elencare i modelli richiedono i permessi `amministratore:ollama:edit`, `:test` e `:view`.
- **Fondamenta dell'architettura**: bus di eventi universale con consegna idempotente, livello di accesso ai dati (repository e unità di lavoro su SQLite), gateway anti-corruzione con registro degli schemi canonici, risoluzione dei conflitti per dominio, agenti autonomi di riconciliazione e auto-riparazione, motore di policy zero-trust con firma HMAC dell'IPC, gateway di comunicazione, registro di audit con radice di Merkle e marca temporale RFC 3161.
- **Primo avvio su rete vuota**: dalla schermata del database vuoto si può creare subito l'amministratore o tornare alla gestione delle reti, senza dover ripristinare il dispositivo.

### Corretto
- **Margini delle app interne**: Amministratore, Impostazioni e le loro sotto-app erano attaccate ai bordi della finestra, perché il contenitore delle app toglie la spaziatura per far posto all'iframe delle app v2. Ora il contenitore applica la stessa spaziatura e lo stesso scorrimento delle pagine del core a ogni app interna, senza CSS dedicato; le app v2 isolate restano a tutta pagina e ricevono la spaziatura dall'SDK.
- **Backend delle app v2**: oltre ad `attiva(koradest)` il caricatore accetta anche `registerBackendHandlers`, così le app migrate dal manifest v1 funzionano senza riscrivere il backend.
- **Errori non più ignorati in silenzio** nel caricatore delle app, nel gestore degli archivi e nei moduli dell'assistente: ogni errore viene registrato.

### Rimosso
- **Anagrafica non è più un'app di sistema**: la cartella `src/apps/anagrafica` e le sue sotto-app sono state eliminate; i dati delle persone appartengono ad Alunni e Gestione del Personale, pubblicate nel Marketplace.

## [1.1.20] - 2026-09-21

### Aggiunto
- **Nome rete automatico all'accesso**: rimosso l'inserimento manuale del nome rete durante l'unione a una rete esistente; il nodo eredita e registra in automatico il nome originale assegnato dall'amministratore/creatore.
- **Identificazione nodi `Nome Rete (Nome PC)`**: i nodi rilevati sulla rete P2P vengono identificati e visualizzati uniformemente come `Nome Rete (Nome PC)`, sia nella tabella nodi, sia nel canvas topologico che nei messaggi di annuncio UDP/Ping.
- **Protocolli P2P e DAG Enterprise**: albero di ricerca Merkle (MST) per anti-entropia veloce O(1), gossipsub, MVCC branch manager, crittografia dei carichi per ruolo e convalida nodi tramite PKI CA.

### Corretto
- **Grafica registrazione primo amministratore**: layout riprogettato con design Fluent 2 pulito, campi PIN a 6 cifre senza wrapping, supporto incolla sequenziale e barra di robustezza password integrata nel modulo.

### Rimosso
- **Gestione del Personale non è più un'app di sistema**: è diventata un'applicazione del Marketplace (`gestione_personale` 2.0.0, manifest v2, autore NunzioTech) con archivio proprio e interfaccia isolata. La cartella `src/apps/gestione_personale` è stata eliminata, i permessi `gestione_personale:*` non compaiono più nella policy IPC di Anagrafica e l'id non è più considerato un modulo di sistema dal risolutore delle dipendenze, così le app che dipendono da `gestione_personale` lo installano davvero dallo Store.

## [1.1.8] - 2026-09-18

### Aggiunto
- **Identita cromatica delle sezioni**: ogni sezione di un'applicazione porta una tinta costante su voce di menu, filo dell'intestazione e icone dei riquadri, così chi lavora riconosce dove si trova prima di leggere. Il colore non è mai l'unico segnale: icona e testo restano sempre presenti (WCAG 2.2, criterio 1.4.1). L'SDK assegna le tinte in ordine di menu, quindi **anche le applicazioni già pubblicate la ottengono senza essere modificate**; un'app può dichiarare la propria con `tinta` nella voce di menu. Le variabili `--k-sezione`, `--k-sezione-contenitore` e `--k-sezione-testo` sono a disposizione del CSS delle app.

### Corretto
- **Pulsanti sottolineati**: i pulsanti realizzati come collegamento si sottolineavano al passaggio del mouse, perché la regola generica sui collegamenti aveva specificità zero e nessuna variante di `k-btn` dichiarava `text-decoration`. Riguardava il core e tutte le app.
- **Icone incoerenti fra core e applicazioni**: l'SDK ridefiniva la classe delle icone con una dimensione diversa da quella del design system. Ora la definizione è una sola, la dimensione la decide il contenitore e l'asse ottico del font segue la dimensione reale invece di restare fissato a 24.

### Modificato
- Pulsanti con sollevamento e ombra colorata al passaggio del mouse, pressione che riporta a livello e anello di messa a fuoco coerente su tutte le varianti.

## [1.1.7] - 2026-09-17

### Corretto
- **Nome dell'applicazione aperta nella barra del titolo**: il contenitore mostrava sempre l'etichetta fissa "Applicazione". Il titolo ha ora un proprietario unico e il contenitore pubblica il nome dichiarato dal manifest, normalizzato e troncato prima di essere scritto.
- **Doppio scorrimento sopra le app**: uno stile inline su `#main-content` annullava la regola `overflow: hidden` prevista per il contenitore delle app, lasciando due superfici di scorrimento annidate.
- **Titoli mancanti** per le pagine "Impostazioni di Accesso" e "Informazioni".
- **Caricamento delle app v2 di terze parti**: il manifest viene normalizzato prima del caricamento e l'archivio accetta sia la forma `db` sia la forma `data`; il broker carica l'app di origine e di destinazione prima di instradare, riconosce le azioni scritte con `:` o con `.` e rilascia i token di capacità per tutti gli alias dichiarati.

### Modificato
- **Interfaccia organizzata per funzionalità**: le pagine del renderer sono moduli isolati in `src/js/features/<nome>`, con vista, logica e fogli di stile collocati insieme. `src/css` resta il design system condiviso con l'SDK delle app.
- **Nessun CSS generato da JavaScript**: gli stili di autenticazione, reti, nodi, primo avvio, 2FA, menu e finestra informazioni sono fogli di stile veri, caricati dalla pagina.
- **Il guscio non dipende più dalle funzionalità**: `esc()` e la finestra modale condivisa vivono in `src/js/shared`.
- Nessun file del progetto supera le 500 righe: `componenti.css` è diviso in quattro moduli con aggregatore.

### Aggiunto
- **Controllo degli import** (`npm run verify:import`): verifica che ogni import relativo del renderer e ogni risorsa referenziata da `index.html` esistano davvero.

## [1.1.2] - 2026-09-15

### Aggiunto
- **P2.1 App rifiutate nello Store**: canale IPC `getAppsRifiutate` con policy protetta per visualizzare nello Store le applicazioni presenti su disco ma non caricate (a causa di manifest non conforme o vincoli non soddisfatti), con motivazione ed eliminazione pulita.
- **P2.2 Controllo `minCoreVersion` all'installazione**: verifica semver rigorosa con `confrontaVersioni` sia in installazione manuale che automatica, impedendo l'installazione di pacchetti non supportati dalla versione in esecuzione.
- **Deregistrazione gestori nel CapabilityBroker**: aggiunto `unregisterApiHandlers(appId)` che ripulisce completamente le rotte e le closure delle azioni registrate all'atto dell'aggiornamento o disinstallazione dell'app.

### Corretto
- **Invalidazione cache e moduli Chromium per le app**: risolto il problema di mantenimento in cache dei file e dell'albero dei moduli V8 dopo l'aggiornamento di un'applicazione. Il protocollo `koradest-app` isola ora l'origine dell'iframe con host versionato (`koradest-app://${cartella}--${versione}`) e applica intestazioni HTTP anti-cache complete (`no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, Pragma, Expires`).
- **Pulizia codice e storage di sessione**: l'aggiornamento delle app esegue ora `clearCodeCaches` e svuota lo shadercache e cachestorage di Electron.

## [1.1.1] - 2026-09-14

### Corretto
- **App Store vuoto**: il catalogo delle applicazioni veniva cercato in `nunziotech.it/software/koradest/marketplace.json`, un indirizzo che non esiste. Ora viene letto da `nunziotech.it/software/adestio/marketplace.json`, dove è pubblicato insieme ai pacchetti. Con questa correzione compaiono **Alunni 1.0.0** e **Viaggi di Istruzione 2.0.0**.

## [1.1.0] - 2026-09-14

Piattaforma per le applicazioni v2: isolate, più semplici da scrivere e controllate dal core.

### Aggiunto
- **Manifest v2** per le app del Marketplace, validato durante l'installazione e a ogni avvio: identificativo, versione, ingresso dell'interfaccia e del backend, dati, dipendenze, permessi, ruoli. I file dichiarati devono esistere nel pacchetto; ogni errore viene spiegato.
- **App isolate**: l'interfaccia di ogni app gira in un iframe sandbox con origine opaca e una Content-Security-Policy dedicata. Non accede a `electronAPI`, alla rete, all'archiviazione del browser né ai file del core.
- **Ponte fra app e core** basato su messaggi: l'identità dell'app è decisa dal core e non può essere falsificata; l'utente collegato accompagna ogni chiamata.
- **Runtime del backend** `attiva(k)`: le app dichiarano azioni con ruolo, schema di validazione e scrittura; il core controlla i ruoli dell'utente, valida i dati, salva l'archivio e restituisce il risultato senza doppio involucro. Le chiamate verso altre app portano con sé l'utente.
- **SDK** `koradest-app://sdk/v2/koradest.js` con router a rotte e ruoli, dialoghi e notifiche del core, formati italiani, validazione di codice fiscale e partita IVA, HTML con escaping automatico.
- **Componenti web** per le app: `<k-tabella>` (ricerca, ordinamento, azioni, stato vuoto), `<k-modulo>` (campi tipizzati, validazione, invio con attesa ed errori), `<k-intestazione>`, `<k-statistica>`, `<k-vuoto>`, `<k-caricamento>`.
- Il design system, i font e il tema chiaro/scuro del core vengono applicati automaticamente alle app.
- Dialoghi di conferma, avviso e richiesta del core al posto delle finestre di sistema.
- Test del formato dei manifest e del runtime delle azioni.

### Modificato
- **Layout adattivo**: le pagine non hanno più una larghezza massima. Sugli schermi larghi le corsie della dashboard e le sezioni dei moduli si affiancano, i campi arrivano a quattro per riga; su smartphone tutto si impila. I testi non si ingrandiscono.
- Dati azienda senza larghezze e colonne fisse.
- Ruoli e permessi, Utenti, Errori di sincronizzazione, Registro errori, Brand e firme, Diagnostica P2P, Sicurezza account e le viste di stato dell'accesso ridisegnati con i componenti `k-`, senza gestori inline né variabili globali.

### Rimosso
- Installazione e caricamento delle app del Marketplace con il manifest precedente: vanno aggiornate al formato v2.

### Sicurezza
- I ruoli delle app sono verificati nel backend per ogni azione.
- La pagina di un'app non può incorporare altre pagine, inviare form verso l'esterno né aprire connessioni.

## [1.0.1] - 2026-09-14

Interfaccia rinnovata e correzioni emerse dopo il primo rilascio.

### Aggiunto
- **Design system KORADEST**: token per colori semantici, tipografia e spaziature fluide, altezze dei controlli, raggi ed elevazione; dimensione del testo che si adatta alla finestra.
- **Libreria di componenti** `k-`: intestazioni di pagina, card, griglie responsive con container query, bottoni, campi, interruttori, scelte a card, tab segmentate, badge, tabelle, dialog, toast, stati vuoti, skeleton, console di log, barre di avanzamento.

### Modificato
- Schermata di avvio con il significato esteso corretto: **K**ernel **O**pe**R**ativo e **A**rchitettura **D**inamica per l'**E**spansione e lo **S**viluppo **T**ecnologico; lo stesso nella finestra Informazioni.
- Barra del titolo e barra di stato più sottili; la barra di stato nasconde le etichette meno importanti sugli schermi stretti.
- Dashboard, App Store, Reti, Accesso, Amministratore, Impostazioni, Profilo personale, Server SMTP, Database di rete e Aggiornamenti ridisegnati con i nuovi componenti.
- Kit delle schede anagrafiche (Gestione personale, Profilo personale) più compatto e coerente.
- Notifiche a comparsa in basso a destra, con varianti e testo sempre sicuro.
- Azioni sui nodi del Database di rete confermate con dialog invece che con finestre di sistema.

### Corretto
- Credenziali di rete: il codice non compariva mai e veniva mostrato il messaggio fuorviante "Non disponibile sui database legacy". Ora PIN o password vengono verificati e l'errore reale viene spiegato.
- Test del server SMTP: la traccia mostrava `\n` letterali invece di andare a capo.
- Nomi e indirizzi dei nodi e dei moduli ora sono sottoposti a escaping prima di essere mostrati.

### Rimosso
- Importazione automatica degli spazi di lavoro legacy all'avvio.

## [1.0.0] - 2026-09-14

Prima versione di **KORADEST** — Kernel Operativo e Architettura Dinamica per l'Espansione e lo Sviluppo Tecnologico.

### Aggiunto
- **Kernel di sistema** a disposizione di ogni applicazione tramite `host.kernel`:
  - pianificazione di lavori periodici con espressioni cron a cinque campi e scorciatoie italiane (`@ogni-giorno`, `@ogni-settimana`, ...);
  - invio di email con il server SMTP del core (permesso `kernel:email`);
  - notifiche agli utenti (permesso `kernel:notifiche`);
  - registro di sistema con l'applicazione come contesto;
  - cartella dei file per rete e applicazione (`dbs/<rete>/apps/<id>/allegati`, `export`), confinata;
  - *dependency pooling*: con `kernelModules` le app usano le librerie del core senza impacchettarle.
- **App Store con albero delle dipendenze**: installa prima le app richieste, rispetta i vincoli di versione (`>=`, `^`, `~`, intervalli), blocca l'installazione se una dipendenza manca, è incompatibile o circolare, e spiega il motivo.
- Dettaglio dell'app nello Store con categoria, autore e stato di ogni dipendenza.
- **Dashboard a corsie**: Sistema, Scuola e Didattica, Medicina e Sanità in posizione fissa, le altre generate dalle categorie delle app installate; card compatte con descrizione limitata a due righe.
- Categorie delle applicazioni in italiano, con sinonimi inglesi accettati nei manifest.
- Autore **KORADEST** per le applicazioni di sistema.
- Suite di test del kernel (`npm run test:kernel`): dipendenze, pianificazione, moduli condivisi, file delle app.
- Decisione architetturale [002](docs/decisioni/002-kernel-e-app-store.md).

### Modificato
- Nuovo nome in tutto il sistema: prodotto, installer, cartella dati `%APPDATA%\Koradest`, protocolli `koradest://` e `koradest-app://`, API `window.koradestNative`, protocollo di scoperta P2P, regole firewall, variabili `KORADEST_*`, sali di derivazione delle chiavi.
- "Aggiornamenti e download" diventa **App Store**.
- La disinstallazione di un'app riporta quanti elementi ha davvero eliminato, compresa la cartella dei file dell'app.
- Le card della dashboard mostrano nome, descrizione e autore con escaping dei testi forniti dai manifest.

### Sicurezza
- L'installer esclude file di ambiente, chiavi, configurazioni degli assistenti AI, log, test e documentazione interna.
- File per assistenti AI e script di patch rimossi dal repository e ignorati da git.
- Il repository ufficiale delle applicazioni non ha più una sorgente di riserva su GitHub.

### Rimosso
- Compatibilità con Adestio: KORADEST non legge reti, archivi, configurazioni o copie di sicurezza create con Adestio e non comunica con nodi Adestio.

[1.0.0]: https://github.com/AprileNunzio/Koradest/releases/tag/v1.0.0
