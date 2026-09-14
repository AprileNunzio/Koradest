# 002 — Kernel KORADEST, App Store con dipendenze, dashboard a corsie

Stato: accettata, prima fase realizzata (settembre 2026)

## Contesto

Il progetto passa da gestionale a sistema operativo distribuito fra i computer di una
rete locale. Le applicazioni devono essere leggere, non duplicare dati né librerie, e
appoggiarsi al core per i compiti comuni. Il riferimento è il manifesto KORADEST
(Kernel Operativo e Architettura Dinamica per l'Espansione e lo Sviluppo Tecnologico).

## Decisioni

### Cambio di nome
Tutto ciò che si chiamava Adestio ora si chiama KORADEST: prodotto, installer, cartella
dati (`%APPDATA%\Koradest`), protocolli `koradest://` e `koradest-app://`, API
`window.koradestNative`, intestazioni e messaggi P2P, regole firewall, variabili
`KORADEST_*`, e anche i sali e i segreti di derivazione delle chiavi.

Non esistono versioni precedenti da supportare: KORADEST 1.0.0 non legge reti, archivi,
configurazioni né copie di sicurezza create con Adestio, non ne copia i dati e non dialoga
con nodi Adestio. Si parte da una rete nuova. Restano soltanto gli identificativi delle
applicazioni già pubblicate (`adestio_business_suite`, ...), che sono anche namespace dei
loro archivi e verranno rinominati insieme alle applicazioni.

### App Store e dipendenze
Il manifest dichiara `"dependencies": { "id": "vincolo" }` con vincoli `*`, `1.2.0`,
`>=`, `>`, `<=`, `<`, `^`, `~`, anche combinati. L'installazione calcola un piano in
ordine topologico e installa prima le dipendenze mancanti o troppo vecchie. Se una
dipendenza manca dallo Store, non ha una versione adatta o forma un ciclo, **non viene
installato nulla** e l'utente legge il motivo. Una dipendenza richiesta da altre app
installate non può essere disinstallata.

### Kernel
Il terzo argomento di `registerBackendHandlers` contiene `kernel`:

- `log` — registro di sistema con l'app come contesto;
- `pianificazione` — cron a cinque campi gestito dal core, annullato allo scaricamento;
- `email` e `notifiche` — motori del core, protetti dai permessi `kernel:email` e
  `kernel:notifiche`;
- `file` — cartella `dbs/<rete>/apps/<id-app>/` con `allegati` ed `export`, confinata;
- `moduli` — dependency pooling: `"kernelModules": ["xlsx"]` rende disponibili le
  librerie già presenti nel core senza includerle nel pacchetto.

### Dashboard
Card compatte, descrizione troncata a due righe, corsie per categoria: Sistema, Scuola e
Didattica, Medicina e Sanità in posizione fissa, le altre in ordine alfabetico e solo se
contengono app. Le categorie del manifest accettano sinonimi italiani e inglesi.

## Limiti noti e passi successivi

1. **Archivi dentro la cartella dell'app.** Il database resta `dbs/<rete>/app_<ns>.enc`;
   spostarlo in `dbs/<rete>/apps/<id>/` richiede di migrare backup, purga, esportazione e
   sincronizzazione insieme.
2. **File non cifrati né replicati.** Allegati ed export sono file normali del nodo.
3. **Pianificazioni su ogni nodo.** Un lavoro gira su ogni nodo che carica l'app; un
   compito da eseguire una volta per rete (es. un'email) va reso idempotente dall'app
   finché il kernel non elegge un nodo incaricato.
4. **Pool di moduli statico.** Sono concesse solo le dipendenze dirette del core; il
   download su richiesta nel pool non è ancora realizzato.
5. **Consenso ai dati di un'altra app.** Le chiamate fra app passano dal broker delle
   capacità con i permessi del manifest; manca una schermata in cui l'amministratore
   approva esplicitamente l'accesso in lettura/scrittura.
6. **Isolamento.** Le app girano nel processo principale; vedi il limite già documentato
   nel README.
