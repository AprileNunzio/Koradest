# 001 — Modello multi-azienda: una rete per azienda

Stato: **accettata** — 2026-09-12
Ambito: isolamento dei dati fra aziende diverse gestite dalla stessa installazione

## Contesto

KORADEST deve servire piu aziende. Esistono due modi di realizzarlo e sono
mutuamente esclusivi nel lungo periodo, perche il costo di passare dall'uno
all'altro cresce con il numero di clienti installati.

**A. Una rete blockchain per azienda.** Ogni azienda ha il proprio codice di
rete, il proprio archivio cifrato, il proprio registro distribuito e i propri
nodi. La postazione ne tiene aperta una per volta.

**B. Piu aziende dentro la stessa rete.** Una sola rete, una colonna
`tenant_id` su ogni tabella, e un filtro applicato a ogni interrogazione.

Allo stato attuale il codice non ha alcun concetto di azienda: `tenant_id` non
compare in nessuna migrazione e `azienda_sedi` non ha una colonna che leghi la
sede a un'azienda. Di fatto il software implementa gia il modello A, ma senza
averlo dichiarato.

## Decisione

Si adotta il **modello A: una rete per azienda**.

## Motivazioni

L'isolamento e **crittografico, non applicativo**. Nel modello A i dati di
un'azienda sono cifrati con una chiave derivata dal suo codice di rete: il
codice di un'azienda non apre l'archivio di un'altra, e questo e verificato da
un test. Nel modello B l'isolamento dipenderebbe dalla correttezza di ogni
singola `WHERE tenant_id = ?`: una sola query dimenticata espone i dati di un
cliente a un altro, e il difetto sarebbe silenzioso.

Il perimetro del GDPR coincide con la rete. Una richiesta di cancellazione,
una copia di sicurezza, un registro dei trattamenti e una politica di
conservazione hanno confini netti e non richiedono di filtrare per azienda.

La replica P2P e gia scoperta e limitata per rete: i nodi di aziende diverse
non si vedono e non contano l'uno per il quorum dell'altro. Nel modello B
tutti i nodi di tutte le aziende parteciperebbero allo stesso registro.

Il modello A e gia implementato, testato e in produzione dalla 2.0.27.

## Conseguenze accettate

Un utente che opera su piu aziende ha **un'identita separata per ciascuna**:
credenziali distinte e nessuna sessione condivisa. Passare da un'azienda
all'altra richiede di chiudere la rete corrente e aprirne un'altra, con
reinserimento del codice se non memorizzato.

Non esistono dati condivisi fra aziende ne reportistica consolidata di gruppo.
Un eventuale consolidamento va costruito fuori da KORADEST, esportando da
ciascuna rete.

Ogni azienda ha il proprio spazio su disco e le proprie copie di sicurezza: lo
spazio occupato cresce linearmente con il numero di aziende gestite sulla
stessa postazione.

## Conseguenze mitigate

Il cambio rete e reso rapido dalla pagina delle reti: le aziende compaiono
come card, l'apertura e un clic quando il codice e memorizzato, e la rete puo
aprirsi da sola all'avvio.

## Se in futuro servisse il modello B

Il passaggio richiede, nell'ordine: aggiungere `tenant_id` a ogni tabella
sincronizzata; introdurre un guard che rifiuti qualunque interrogazione priva
del filtro, invece di affidarsi alla disciplina di chi scrive le query;
estendere il controllo degli accessi con l'azienda come dimensione, accanto a
utente e permesso; rivedere quorum, cancellazione GDPR e conservazione perche
smetterebbero di coincidere con la rete.

Va valutato **prima** di avere una base installata significativa. Dopo, la
migrazione dei dati esistenti da N archivi separati a uno condiviso comporta
la riscrittura del registro distribuito di ogni azienda, operazione che non ha
un percorso di rollback.

## Verifica

`tests/` copre l'isolamento su cui poggia questa decisione: archivi separati
per rete, chiave di una rete che non apre l'archivio di un'altra, scoperta dei
nodi limitata alla rete di appartenenza, quorum calcolato solo sui nodi che
hanno completato un handshake con lo stesso identificativo di rete.
