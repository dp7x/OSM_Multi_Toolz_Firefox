# OSM MultiToolz 2.0.1 — Firefox

## Correzione 2.0.1

Eliminati gli inserimenti di HTML dinamico dal codice dell’estensione: popup, watchlist, TagInfo e relazioni usano elementi DOM e testo. Anche i dati importati dalla watchlist vengono trattati come testo e i collegamenti ai changeset vengono ricostruiti da ID numerici. Rimossa dal pacchetto la vecchia copia `OSM_Multi_Toolz.xpi.old`.

Il validatore Mozilla locale riporta **0 errori e 8 avvisi**: sette appartengono alla libreria Leaflet 1.9.4 originale, uno riguarda la proprietà `data_collection_permissions` non ancora dichiarata. Non è stata inserita la dichiarazione `none`: l’assenza di telemetria non equivale all’assenza delle trasmissioni necessarie ai servizi richiesti dall’utente. Questa dichiarazione andrà definita correttamente per i requisiti Mozilla futuri. Non sono state aggiunte raccolta dati, nuove trasmissioni o richieste di consenso.

## Installazione e prova

1. Estrai lo ZIP.
2. Apri `about:debugging#/runtime/this-firefox`.
3. Premi **Carica componente aggiuntivo temporaneo…** e seleziona `manifest.json` nella cartella estratta.
4. Se Firefox chiede l’accesso ai siti, autorizza OpenStreetMap API e il server delle tessere OSM per usare la nuova funzione.
5. Per aggiornare una prova temporanea, premi **Ricarica** accanto all’estensione e riapri le schede della mappa.

Questa installazione è temporanea e viene rimossa alla chiusura di Firefox. Per un’installazione permanente ordinaria è necessaria la firma Mozilla. Il pacchetto è sorgente, non firmato. L’ID Gecko preesistente è mantenuto, così un futuro aggiornamento della versione firmata conserva la stessa identità.

## Funzione Oggetti cancellati

Apri un changeset in MultiToolz e premi **Oggetti cancellati**. La finestra elenca le way cancellate e i nodi cancellati che non appartengono alle way elencate. Cliccando un oggetto si apre una scheda con geometria storica e tutti i tag, visibili anche cliccando la geometria. Durante l’attesa sono presenti indicatori di caricamento.

Si selezionano esclusivamente gli elementi della sezione `delete` del changeset, verificando anche la versione cancellata nella cronologia. Si recupera l’ultima versione visibile disponibile prima di quella cancellazione. Per le coordinate dei nodi si considera la cronologia fino alla data della cancellazione, evitando spostamenti successivi. Lo sfondo è la mappa OSM attuale.

Una way cancellata può essere stata unita a un’altra way: in quel caso il vecchio ID risulta cancellato, anche se la strada è ancora visibile sulla mappa attuale.

Le relazioni cancellate sono conteggiate ma non visualizzabili. Le versioni oscurate da OSM o le cronologie non disponibili possono impedire la ricostruzione. Le geometrie incomplete sono segnalate e le lacune non vengono collegate artificialmente. Se una way non è recuperabile, alcuni suoi nodi potrebbero comparire separatamente nella lista: un avviso lo segnala.

La funzione è di sola lettura e non richiede login. Nessun ripristino o modifica viene inviato a OSM.

## Connessioni e componenti

I dati storici sono richiesti ad `api.openstreetmap.org`, le tessere di sfondo a `tile.openstreetmap.org`. Le richieste delle tessere identificano OSM MultiToolz tramite `X-Requested-With` e rispettano la cache HTTP del browser. Non vengono falsificati User-Agent o Referer; non sono stati aggiunti telemetria o raccolta dati.

Leaflet 1.9.4 è incluso localmente, con licenza e attribuzione in `THIRD_PARTY_NOTICES.md` e `vendor/leaflet/LICENSE`. Nessuno script remoto viene caricato dalla nuova funzione.

## Versione 2.0

Chrome e Firefox includono lo stesso visualizzatore storico, la correzione delle tessere OSM e gli indicatori di attesa. Sono mantenute le differenze preesistenti delle due estensioni. Il caricamento delle tessere non richiede `AbortSignal.any`, per restare compatibile con Firefox 109.

## Verifiche

Prove automatiche delle nuove schermate eseguite in Chromium e nel motore Firefox 135, con API dell’estensione e risposte OSM simulate: pulsante, finestra, lista senza vertici duplicati, nodi singoli, geometria, tag, versione precedente alla cancellazione anche dopo un ripristino, coordinate storiche, contenuti trattati come testo, cronologie mancanti, geometria parziale, changeset vuoto, parametri errati, errore HTTP e riprova, identificazione delle richieste delle tessere e indicatori di caricamento. Le prove disattivano `AbortSignal.any` per controllare anche questa compatibilità.

Controllati sintassi JavaScript, JSON, riferimenti ai file e integrità degli ZIP. Il validatore Mozilla non segnala errori; rimangono avvisi per codice preesistente, Leaflet e la dichiarazione Mozilla sulla raccolta dati da valutare prima della pubblicazione nello Store. L’installazione manuale e le autorizzazioni nella propria installazione Firefox restano da verificare.

I repository remoti non sono stati modificati e i pacchetti non sono stati pubblicati negli Store.
