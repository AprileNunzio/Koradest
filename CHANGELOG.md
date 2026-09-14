# Changelog

Tutte le modifiche rilevanti di KORADEST sono documentate in questo file.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/).

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
