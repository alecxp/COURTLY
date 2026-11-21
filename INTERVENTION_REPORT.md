# COURTLY — Intervento e verifica

## Correzioni applicate in questa passata
- Accesso: il flusso Supabase chiama `enter_coach_mode` per coach e `enter_player_mode` per giocatore; il codice coach resta `0000`.
- Rimossi i controlli che permettevano di cambiare ruolo localmente dentro Allenamenti e Partite: il ruolo proviene dall'accesso.
- Allenamenti: rimosso il dataset di allenamenti fittizi; roster locale filtrato sui giocatori; salvataggio atteso dopo il caricamento iniziale per evitare che il primo render vuoto sovrascriva i dati.
- Partite: rimosso il match fittizio iniziale; roster locale filtrato sui giocatori.
- Squadra: eliminato il roster demo predefinito; nickname e ruolo caricati anche quando esiste già una squadra; riconoscimento del seed demo precedente; controlli coach-only per creazione squadra, aggiunta e rimozione membri.
- Dashboard: rimossi eventi e conteggi fittizi; usa allenamenti e partite locali, e aggiorna le risposte negli archivi evento.
- Coach: dashboard usa allenamenti, partite e roster locali, senza statistiche statiche inventate.
- Calendario: allenamenti e partite team letti dal browser; rimossi eventi team di esempio; agenda mostra gli eventi futuri. Gli eventi Pro Basket restano dimostrativi.
- Statistiche: roster locale al posto di nomi demo hardcoded.
- Migrazione `20261124_coach_code_trigger_fix.sql`: corregge il conflitto tra trigger di protezione profilo e RPC coach usando un flag transaction-local.
- Migrazione `20261125_player_mode_rpc.sql`: permette di entrare esplicitamente in modalità giocatore e viene chiamata dall'accesso quando Supabase è configurato.


## Controlli statici eseguiti
- Parser TypeScript: 17 file TS/TSX, 0 diagnostiche sintattiche.
- `package.json`, `tsconfig.json`, `.eslintrc.json`: JSON valido.
- 12 route App Router rilevate.
- 71 link diretti controllati: 0 destinazioni route mancanti.
- Archivio ZIP testato per integrità.

## Test non eseguiti
- Installazione npm: timeout; il tentativo offline non è riuscito perché manca il pacchetto `@supabase/supabase-js` nella cache.
- Build Next.js e type-check completo non verificati (dipendenze non disponibili).
- Test browser, click, refresh e test multiutente non eseguiti.
- Migrazioni SQL non applicate a Supabase reale; RPC, RLS e sincronizzazione cross-device non verificati.

## Limiti funzionali attuali
- Team, roster, allenamenti, partite, convocazioni, notifiche e statistiche restano demo/localStorage: non sono sincronizzati tra dispositivi.
- La gestione squadra/roster è locale; il flusso SQL di richiesta ingresso non è collegato alle schermate.
- Il codice coach `0000` è temporaneo e non sicuro per una pubblicazione.
- Le partite Pro Basket nel calendario sono dati dimostrativi, non un feed live.
