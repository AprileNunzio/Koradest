# KORADEST verso l'enterprise — registro dei task

Aggiornato al 2026-09-22 · core **1.1.24** (build locale, non pubblicata).
Legenda: `[x]` fatto e verificato · `[ ]` da fare · `[~]` iniziato.

---

## Regole di sviluppo vincolanti

1. **Clean Architecture**: separazione delle responsabilità, un file = una responsabilità (SoC, SRP).
2. **Codice puro**: nessun commento nel codice nuovo, salvo richiesta esplicita.
3. **Massimo 500 righe per file**: oltre, si divide in moduli.
4. **UI responsive nativa**: ogni componente è progettato per mobile e desktop (una colonna sotto i 640 px, bersagli tattili da 44 px, niente scorrimento orizzontale).
5. **Zero-Trust**: prevenzione OWASP, sanitizzazione totale degli input, dati sensibili cifrati, negazione per default.
6. **Gestione degli errori**: `try/catch` solo ai confini (I/O, rete, DB, IPC); altrove gestione globale; mai eccezioni ignorate in silenzio (`npm run verify:catch` blocca i nuovi `catch` vuoti).
7. **Struttura per funzionalità**: ogni pagina o modulo vive nella sua cartella con vista, logica, stili e interfacce.

Regole di rilascio:
- Mai pubblicare `.env`, chiavi, `.claude`, `.agents`, `AGENTS.md`, `CLAUDE.md` e simili: `node scripts/verifica_pacchetto.js <dist>` lo controlla sull'`app.asar`.
- La build va fatta fuori da Google Drive (`-c.directories.output=C:\Users\april\AppData\Local\koradest-dist`).
- Il branch locale `koradest-release` si pubblica come `main`; `master` non va mai pubblicato.
- Release complete: note in italiano dal CHANGELOG (`node scripts/note_rilascio.js vX.Y.Z`), installer, blockmap, `latest.yml`, `SHA256SUMS.txt`.

---

## Fatto

### 1.1.23 (pubblicata su GitHub)
- [x] Contenitore unico delle app interne con i margini delle pagine del core (`src/css/main.css`, `#app-mount-point`).
- [x] Politiche IPC per i canali `ollama:*`; 27 `catch` vuoti sostituiti da registrazione dell'errore.
- [x] Commit di tutto il lavoro rimasto fuori (Jarvis, bus, DAL, zero-trust, rimozione di Anagrafica).

### 1.1.24 (build locale)
Replica e audit (fase 1):
- [x] **Cattura delle modifiche dal database**: trigger temporanei per connessione e registro `_k_cambi`, al posto del parser SQL a espressioni regolari — `backend/core/change_capture/`.
- [x] **Transazioni con savepoint**: annidabili; un errore annulla dati, storico e repliche insieme.
- [x] **Le scritture remote non rientrano in circolo**: i trigger scattano solo dentro un'operazione tracciata.
- [x] **Audit per campo** in `_k_audit` con operatore, data, prima/dopo, catena di impronte SHA-256 e trigger che impediscono modifica e cancellazione — `backend/core/field_audit/`.
- [x] **Contesto dell'operatore** propagato con `AsyncLocalStorage` — `backend/core/operation_context/`.
- [x] Azioni di sistema `koradest.storico` e `koradest.storico.verifica` aggiunte a ogni app con archivio; prefisso `koradest.` riservato.
- [x] Tabelle `_k_*` escluse dalla replica.
- [x] Ruoli `default: true` concessi solo a chi ha accesso all'app.
- [x] Test: `tests/change_capture_audit.test.js` (23 controlli).

Moduli (requisito utente):
- [x] `<k-modulo>` riscritto in `src/sdk/v2/modulo/` (validazione, campi, stato, coda di salvataggio, storico, stili).
- [x] Bordo verde se il campo è corretto, rosso con messaggio sotto il campo se è sbagliato.
- [x] Icona dello storico accanto a ogni campo (attributo `tabella`), finestra dello storico che su mobile diventa un pannello dal basso.
- [x] Salvataggio automatico con `onSalva`: attesa di 700 ms durante la digitazione, salvataggio immediato all'uscita dal campo, creazione del record appena i campi obbligatori sono validi, salvataggi in coda senza sovrapposizioni, errori del server mostrati sul campo.
- [x] Compatibilità con `onInvia` mantenuta; `k-campo-live` (rotto, mai caricato) rimosso.
- [x] Verificato nel browser (desktop e 375 px).

AI:
- [x] **Gateway AI** con un contratto unico e più fornitori: `backend/ai/gateway/` (Ollama e Gemini).
- [x] Chiave API cifrata con `safeStorage` in `userData/ai/chiavi.json`, mai restituita all'interfaccia e inviata solo nell'intestazione `x-goog-api-key`.
- [x] Ciclo agente a più passi con limite configurabile (1–12).
- [x] Verso fornitori cloud: codice fiscale, IBAN e credenziali mascherati nei risultati degli strumenti; dati con istruzioni sospette bloccati.
- [x] Contesto della pagina sanificato; il prompt di sistema non è più sovrascrivibile dall'interfaccia.
- [x] **Strumenti automatici**: ogni `k.azione` delle app v2 diventa uno strumento con schema ricavato da `valida` e descrizione da `descrizione`.
- [x] Guardia RBAC che nega per default (prima autorizzava chi non aveva permessi).
- [x] Pannello "Motore di intelligenza artificiale" nella sotto-app Ollama.
- [x] Canali `ai:*` con politiche dedicate.
- [x] Test: `tests/ai_gateway.test.js` (37 controlli).
- [x] **Impostazioni di Ollama non salvate**: `saveConfig` era chiamata con i parametri invertiti. Nuovo `aggiornaSezione` in `backend/config.js`, che rifiuta di scrivere se la configurazione esistente non è leggibile.
- [x] Jarvis con tema chiaro sui token del design system, pannello dal basso su mobile, pulsante raggiungibile da tastiera.

Fase 0 e processo:
- [x] Sotto-app Nodi e Rete: import corretto; `verifica:import` ora copre `src/apps`, `src/sdk`, `src/ui` (122 file invece di 78).
- [x] `scripts/verifica_pacchetto.js`, `scripts/note_rilascio.js`.
- [x] Workflow `.github/workflows/verifica.yml` (a ogni push e PR) e `rilascio.yml` (da tag `v*.*.*`): versione coerente, verifica, build, controllo del pacchetto, SHA-256, release.
- [x] Tetto dei `catch` vuoti abbassato a 499.
- [x] **Configurazione scritta nei sorgenti**: fuori da Electron `backend/config.js` salvava `config.enc` nella cartella del progetto, e un test l'ha fatta finire nella build. Ora il ripiego è `KORADEST_CONFIG_DIR` o la cartella temporanea; la build esclude `*.enc`, `*.db`, `*.sqlite*`, `*.bak` e `active_node.json`; `verifica_pacchetto.js` l'ha intercettato prima dell'installazione.

### 1.1.25 (build locale) e app di prova
- [x] Pulsante "Chiudi" visibile nei moduli automatici; storico con euro (`archivio: 'centesimi'`), date italiane, Sì/No ed etichette delle tendine; `created_at`/`updated_at` esclusi dallo storico; nomi degli operatori con ripiego sull'identificativo.
- [x] API `presaServizio` morte rimosse dal preload. Il backend di Anagrafica **non è codice morto**: è il dominio persona del core (utenti, login, GDPR, bundle, avvio della rete). Va migrato al contratto `Persona@1` in P2, non cancellato.
- [x] **App-BilancioFamiliare 3.0.0** (app di prova del core, pubblicata su FTP il 2026-09-22, `minCoreVersion` 1.1.25): riscritta in v2. Conti, categorie con budget, movimenti e trasferimenti, scadenze ricorrenti con "segna pagata", salvadanai, cruscotto. Importi in centesimi interi, moduli con salvataggio automatico e storico, descrizione su ogni azione per l'AI. Namespace nuovo `bilancio_familiare_v3`: i dati della v2 non vengono importati. La v2.0.13 è archiviata in `Koradest-Marketplace/_archivio/App-BilancioFamiliare-v2.0.13/`. Test: `node --no-warnings tests/backend.test.js` (28 controlli). Verificata sul banco con il backend vero, anche a 375 px.
- [x] `COME_CREARE_UNA_APP_PERFETTA.md` aggiornato: nuova sezione 0 con le novità 1.1.24; corrette le sezioni che indicavano alle app di importare moduli interni del core (bus, merger, DAL/ACL, WASM, backup, audit, bridge AI, SDUI), non raggiungibili da un'app installata. Le app del Marketplace le aggiorna un'altra AI seguendo la guida; le sezioni della scheda di Alunni erano già state migrate a `creaEditor` con salvataggio automatico.

### 1.1.26 (build locale)
- [x] **Contesto dell'AI superato (51.034 token su 8.192)**: selezione degli strumenti per domanda (`backend/ai/gateway/selezione_strumenti.js`), manuale consultabile dal modello (`manuale_strumenti.js`), insieme di strumenti che cresce durante il ciclo (`insieme_strumenti.js`), risultati troncati (`limite_risultati.js`), compattazione della conversazione (`compattazione.js`), `num_ctx` inviato a Ollama, istruzioni operative con la data. Misurato sulle app reali: da 289 strumenti (circa 37.000 token) a 8–12 strumenti (meno di 2.000). Test: `tests/ai_contesto.test.js` (15 controlli).
- [x] Controllo di Jarvis: attivo, disattivo, da chiedere (domanda al primo accesso di un amministratore), rifiuto lato server da disattivato, precaricamento del modello all'avvio, permanenza in memoria, carica o libera subito.
- [x] Pagina "Intelligenza artificiale" riscritta per sezioni (`src/apps/amministratore/subapps/ollama/<sezione>/`), un solo Salva, validazione anche lato server; rimosse le impostazioni finte.
- [x] Comprensione automatica delle app sconosciute (`interpretazione_azioni.js`): descrizioni dedotte, scrittura dedotta dal nome, strumenti anche per i backend `registerBackendHandlers`. Test: `tests/ai_autonomia.test.js` (15 controlli).

---

## Da fare, in ordine di priorità

### P0 — Pulizia e processo
- [ ] Pubblicare 1.1.25 dopo il collaudo locale (commit, push su `main`, tag: il workflow `rilascio.yml` fa il resto). Finché il core 1.1.25 non è pubblicato, BilancioFamiliare 3.0.0 sul Marketplace si installa solo sui PC aggiornati a mano.
- [ ] SDK: portare `creaEditor` (editor in linea con salvataggio automatico, chiusura e aggiornamento dell'elenco) dentro l'SDK del core, così le app non lo copiano più.
- [ ] Il packer del Marketplace non ha `node_modules` propri: oggi si lancia con `NODE_PATH=../Koradest/node_modules`. Carica anche l'intero `marketplace.json` locale: va reso capace di aggiornare solo la voce dell'app partendo dal catalogo online.
- [ ] BilancioFamiliare: importazione dei dati della v2.0.13 (tabelle `bf_*` nel vecchio namespace) e ritorno delle funzioni avanzate con il motore archiviato (previsioni, 730, CCNL scuola, estratti conto).
- [ ] Decidere per ogni modulo senza chiamanti se **collegarlo o rimuoverlo**: `backend/agents`, `backend/security/zerotrust`, `backend/infrastructure`, `backend/backup/ZeroKnowledgeCloudBridge.js`, `backend/core/WasiPluginHost.js`, `backend/security/Rfc3161TimestampClient.js`, `src/ui/sdui`, `backend/db/mergers`. `backend/db/DAL` e `backend/db/ACL` hanno un solo chiamante ciascuno.
- [ ] Togliere da `preload.js`, dal router IPC e dalla policy i canali delle app rimosse (`anagrafica:*`, e `presaServizio:*` se non più nel core).
- [ ] Firma del codice dell'installer (certificato OV/EV) e `verifyUpdateCodeSignature: true`.
- [ ] Unificare i canali di distribuzione: `scripts/publish.js` carica anche su FTP, il workflow solo su GitHub. Scegliere un'unica fonte per `latest.yml`.
- [ ] Portare i 499 `catch` vuoti a zero per area, partendo da `backend/p2p` (51) e `backend/dag` (37).
- [ ] Ripulire gli zip già pubblicati che contengono AGENTS.md/CLAUDE.md/.claude: BusinessSuite 2.1.17, BilancioFamiliare 2.0.13, DentalSuite 2.0.86.

### P1 — Moduli ovunque (requisito utente)
- [ ] Migrare **ogni** modulo delle app del Marketplace a `onSalva` + `tabella` (Alunni `ui/editor.js` e viste, Gestione Classi, Gestione del Personale, Viaggi, Orario, Presa di Servizio). Il backend deve accettare salvataggi parziali: `id` presente = aggiornamento dei soli campi inviati.
- [ ] Moduli del core (Utenti, SMTP, Dati Azienda, Sicurezza, Notifiche, Credenziali…): usare lo stesso componente nel renderer del core e aggiungere l'audit per campo anche alle scritture fatte dai gestori del core (`auth`, `config`), che oggi non passano dal runtime delle app.
- [ ] Aggiungere `descrizione` a tutte le azioni delle app, così gli strumenti AI sono chiari al modello.

### P1 — Affidabilità dei dati
- [ ] **Nomi di tabella qualificati per dominio**: `schema_registry` usa una mappa globale tabella → dominio, quindi due app con la stessa tabella si contendono la replica. È il prerequisito dell'audit di rete.
- [ ] **Audit a livello di rete**: oggi `_k_audit` è locale al nodo. Replicarlo per dominio, oppure ricostruirlo dai blocchi DAG firmati, con l'operatore nel blocco.
- [ ] Conflitti per campo: collegare `field_crdt_merger` e l'HLC all'applicazione dei blocchi remoti (oggi vince la riga intera).
- [ ] Confronto periodico di impronte Merkle per tabella tra i nodi, con allarme in caso di divergenza.
- [ ] Migrazioni sicure: backup automatico prima, prova su copia, ritorno automatico se falliscono.
- [ ] Verifica periodica della catena di audit (`koradest.storico.verifica`) nel pannello salute; esportazione dello storico per ispezioni (CSV e PDF firmato); politica di conservazione.

### P1 — Intelligenza artificiale
- [ ] **Conferma dell'utente** prima di eseguire strumenti con `modifica: true` quando l'agente agisce in autonomia (il metadato è già disponibile).
- [ ] Minimizzazione per i fornitori cloud: mascherare anche i campi dichiarati `sensibile` (nomi, indirizzi, dati sanitari). Dipende dalle entità dichiarative.
- [ ] Risposte in streaming; storico delle conversazioni per utente cifrato.
- [ ] Altri fornitori come nuovi file in `backend/ai/gateway/fornitori/` (API compatibili OpenAI, Anthropic).
- [ ] Rimuovere `OllamaMatterBridge.ask` e `_executeTool`, sostituiti dal gateway, dopo aver aggiornato `tests/ollama_matter.test.js`.
- [ ] Pannello di consultazione del registro AI (`AI_TOOL_CALL`, `AI_ASSISTANT_QUERY`).

### P2 — Modello dati universale (stile Matter)
- [ ] Entità dichiarative nel manifest (`data.entita`): tabelle, migrazioni, CRUD, validazione, permessi per campo, `sensibile`, `conservazione`, `rif:Contratto@1` generati dal core.
- [ ] Contratti di dominio versionati: `Persona@1`, `Classe@1`, `Sede@1`, `Documento@1`, `Pagamento@1`.
- [ ] Migrare Alunni, Gestione Classi e Gestione del Personale come apripista.
- [ ] `<k-tabella entita>` e `<k-modulo entita>` generati dallo schema.

### P3 — Gateway universali (schema porta → outbox → adattatore)
- [ ] Scheletro comune: permessi, quota, idempotenza, audit, segreti custoditi dal core, coda persistente con retry e circuit breaker, pannello "Operazioni in attesa".
- [ ] Identità: LDAP/Active Directory, OIDC, SPID/CIE.
- [ ] Documenti: motore PDF di Viaggi portato nel core, modelli DOCX, firma PAdES/CAdES, protocollo.
- [ ] Comunicazioni: SMTP, PEC, SMS, push.
- [ ] Pagamenti: PagoPA, SEPA.
- [ ] Archivio e backup: disco, NAS, S3, cloud zero-knowledge.
- [ ] Scambio dati: CSV/XLSX, API REST in ingresso, webhook in uscita.

### P4 — Sicurezza ed ecosistema
- [ ] Firma delle app e catalogo firmato, con lista di revoca.
- [ ] Permessi dichiarati mostrati all'installazione.
- [ ] Zero-trust collegato davvero: firma HMAC dell'IPC e mTLS tra i nodi nel percorso reale delle chiamate.
- [ ] CLI `koradest` (crea, avvia, verifica, firma, pubblica), tipi TypeScript generati dai contratti, kit di conformità, documentazione dei contratti.

---

## Come verificare
```
npm run verify
node --no-warnings tests/change_capture_audit.test.js
node tests/ai_gateway.test.js
node scripts/verifica_pacchetto.js C:\Users\april\AppData\Local\koradest-dist
```
