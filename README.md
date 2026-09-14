# KORADEST

**Kernel Operativo e Architettura Dinamica per l'Espansione e lo Sviluppo Tecnologico.**

KORADEST è un sistema operativo distribuito per le reti locali di scuole, studi e imprese. Ogni computer è insieme nodo e server: le macchine condividono archivi cifrati, applicazioni e servizi di sistema senza server centrale, senza servizi esterni e senza duplicare dati o librerie.

Il nome unisce *Kor-* (kernel, il cuore del sistema) e *-adest*, la radice del progetto da cui nasce.

---

## Installazione

Scaricare `Koradest-Setup-<versione>.exe` dalla pagina [Releases](https://github.com/AprileNunzio/Koradest/releases/latest) ed eseguirlo. Requisiti: Windows 10 o 11 a 64 bit.

L'installer configura le regole del Windows Defender Firewall necessarie alla scoperta dei nodi e alla sincronizzazione. Gli aggiornamenti successivi arrivano da soli, dalla release GitHub o da un altro nodo della rete locale.

---

## Concetti

### Reti
Una **rete** è un'organizzazione. Ha un codice di sicurezza che cifra i suoi archivi, un registro distribuito condiviso fra i nodi e le proprie applicazioni installate.

Una postazione può avere più reti registrate — lavoro, casa, studio — ma ne tiene **aperta una per volta**: entrando in un'altra rete i dati della precedente vengono chiusi e ricifrati. La scelta è documentata in [docs/decisioni/001-modello-multi-azienda.md](docs/decisioni/001-modello-multi-azienda.md): l'isolamento fra organizzazioni è crittografico, non applicativo.

### Ogni PC è un server
Non esiste un database centrale né una versione "legacy" da mantenere: ogni computer della rete locale ospita e serve i dati. Le credenziali di rete servono soltanto a stabilire un collegamento sicuro fra i nodi.

### Quorum
Ogni rete ha un numero minimo di nodi collegati sotto il quale l'accesso può essere negato. La regola si replica su tutti i nodi tramite il registro distribuito, quindi non si aggira riconfigurando una singola postazione.

### Nodi
I nodi si scoprono da soli sulla rete locale (ARP, broadcast UDP, mDNS, scansione della sottorete) e sincronizzano il registro fra loro. La scoperta è limitata alla propria rete: un nodo di un'altra organizzazione non viene visto e non conta per il quorum.

### File system gerarchico
I dati sono ordinati per livelli:

```
%APPDATA%\Koradest\dbs\
  <Rete>\                          livello rete, es. Scuola
    app_<namespace>.enc            archivio cifrato di un'applicazione
    apps\<id-app>\allegati\        file dell'applicazione, es. viaggi_istruzione
    apps\<id-app>\export\
```

---

## Kernel

Le applicazioni non gestiscono da sole i compiti comuni: li chiedono al kernel, che li esegue una volta per tutte.

| Servizio | Cosa offre |
|---|---|
| **Pianificazione** | Lavori periodici con espressioni cron, annullati allo scaricamento dell'app |
| **Email** | Invio tramite il server SMTP configurato nel core (permesso `kernel:email`) |
| **Notifiche** | Notifiche in app e per email agli utenti (permesso `kernel:notifiche`) |
| **Log** | Registro di sistema con l'applicazione come contesto |
| **File** | Cartella dell'app nella rete attiva, senza accesso fuori da essa |
| **Moduli** | *Dependency pooling*: le librerie npm vivono una volta sola nel core |

Con il pooling un'app dichiara `"kernelModules": ["xlsx"]` e usa la libreria del core invece di includerla nel proprio pacchetto, che resta di pochi kilobyte.

## App Store

Lo **App Store** installa, aggiorna e rimuove le applicazioni.

- **Dipendenze automatiche.** Se *Viaggi di Istruzione* richiede *Alunni*, lo Store installa prima *Alunni* e poi l'app richiesta. Vincoli di versione come `>=2.0.0` o `^1.4.0` sono rispettati; se una dipendenza manca o è incompatibile non viene installato nulla e il motivo è spiegato.
- **Un solo proprietario dei dati.** *Alunni* è l'unica app che gestisce gli studenti; le altre chiedono il permesso di leggerne o scriverne i dati, che non vengono mai copiati.
- **Autori.** Le app di sistema sono firmate **KORADEST**; quelle di settore riportano lo sviluppatore, ad esempio **NunzioTech** per la scuola. Oltre al repository ufficiale si possono aggiungere repository di terze parti.

## Dashboard

Card compatte con descrizione limitata a due righe, divise in corsie per settore:

1. **Sistema** — App Store, nodi e rete, amministrazione
2. **Scuola e Didattica**
3. **Medicina e Sanità**
4. altre corsie create automaticamente dalle categorie delle app installate

---

## Sicurezza

### Cifratura e chiavi
Gli archivi sono cifrati in AES-256-GCM con una chiave derivata dal codice di rete tramite scrypt. Il codice **non è mai salvato in chiaro**: il registro delle reti conserva solo un identificativo pubblico irreversibile, e il codice vero soltanto se l'utente sceglie di memorizzarlo, sigillato dalle credenziali di Windows.

### Kit di recupero
Il codice di rete può essere diviso in **n quote di cui ne bastano k** per ricostruirlo (Shamir secret sharing su GF(256)). Le quote sono trascrivibili a mano, hanno un checksum che intercetta un carattere sbagliato e correggono le confusioni tipiche fra I/1 e O/0. Senza kit, perdere il codice significa perdere i dati in modo definitivo.

### Controllo degli accessi
Ogni canale interno dichiara il livello richiesto — pubblico, sessione, permesso specifico o amministratore — e la verifica avviene nel processo principale. **Un canale privo di politica viene rifiutato**: dimenticarsene fallisce chiuso, non aperto. Le operazioni critiche richiedono di reinserire PIN o password.

### Applicazioni di terze parti
Le app dichiarano nel manifest le capacità che usano. Una chiamata verso un'altra applicazione, un'email o una notifica richiedono il permesso dichiarato; le chiamate al proprio backend sono sempre consentite.

> **Limite noto**: le app girano nello stesso processo di rendering del core. Il confine è di correttezza, non di isolamento: un'app deliberatamente ostile non è contenuta. Installare solo applicazioni di cui ci si fida.

---

## Protezione dei dati

- **Cancellazione**: rimuove le righe, anonimizza l'account e rende illeggibili i payload già scritti nel registro, sostituendoli con una lapide che ne preserva firma e genitori. L'istruzione si replica su tutti i nodi.
- **Conservazione**: periodi separati per accessi, notifiche, log e audit, con anteprima prima della purga.
- **Registro dei trattamenti**: generato dallo stato reale del sistema ed esportabile in Markdown.
- **Nessuna risorsa remota**: font e icone sono nel pacchetto; nessun indirizzo IP trasferito a CDN o servizi terzi.

> **Limite noto**: la cancellazione agisce sui nodi che ricevono l'istruzione. Le copie di sicurezza esportate prima vanno distrutte dal titolare.

---

## Struttura

```
backend/
  core/           runtime delle app, App Store, router IPC, aggiornamenti
  core/kernel/    servizi di sistema: pianificazione, file, moduli condivisi
  networks/       reti: registro cifrato, ciclo di vita, quorum, kit di recupero
  security/       controllo accessi IPC, capacità delle app, GDPR, conservazione
  dag/            registro distribuito: blocchi, sincronizzazione, cancellazione crittografica
  p2p/            scoperta dei nodi, trasporto, protocollo
  db/             archivi cifrati, thread crittografico, migrazioni
src/
  js/shell/       barra del titolo, menu, categorie delle app
  js/pages/       dashboard, App Store, reti, autenticazione, nodi
  apps/           applicazioni di sistema incluse
docs/decisioni/   decisioni architetturali registrate
tests/            suite di verifica eseguibili con node
```

---

## Sviluppo

### Requisiti
Node.js 22 o superiore, Windows 10/11 x64.

### Clonazione su Windows
Alcuni percorsi del repository sfiorano il limite di 260 caratteri di Windows. Abilitare una volta il supporto ai percorsi lunghi:

```bash
git config --global core.longpaths true
```

In alternativa, clonare in un percorso breve come `C:\Dev\Koradest`.

### Avvio
```bash
npm install
npm start
```

### Verifica
```bash
npm run verify
```

Esegue: coerenza dello store, identificativi del renderer, classi CSS, copertura delle politiche IPC, assenza di risorse remote, tetto dei blocchi `catch` vuoti, la suite di sicurezza e quella del kernel (dipendenze, pianificazione, moduli condivisi, file delle app).

### Pubblicazione
```bash
KORADEST_DIST_DIR="C:/percorso/fuori/da/cartelle/sincronizzate" npm run build:publish
```

> **Attenzione**: se il repository si trova in una cartella sincronizzata (Google Drive, OneDrive, Dropbox) la build fallisce, perché il servizio di sincronizzazione blocca l'eseguibile appena scritto. `KORADEST_DIST_DIR` sposta l'output fuori dalla cartella sincronizzata.

### Creare un'applicazione
La guida completa per sviluppatori è `COME_CREARE_UNA_APP_PERFETTA.md`, nel repository delle applicazioni. Le decisioni sul kernel sono in [docs/decisioni/002-kernel-e-app-store.md](docs/decisioni/002-kernel-e-app-store.md).

---

## Licenza

Tutti i diritti riservati. Sviluppato e manutenuto da **NunzioTech**.
