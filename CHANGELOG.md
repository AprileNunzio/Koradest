# Changelog

Tutte le modifiche rilevanti di KORADEST sono documentate in questo file.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/).

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
