# COURTLY — pubblicazione online (web app)

COURTLY è una web app Next.js: gli utenti la aprono da un URL su telefono o PC, senza scaricare un'app.

## Servizi
- **Vercel**: hosting e deploy del sito Next.js.
- **Supabase**: autenticazione e database condiviso.

## 1. Preparare Supabase
1. Crea un progetto Supabase.
2. In Project Settings → API copia `Project URL` e la chiave pubblica `anon`/`publishable`.
3. In Authentication configura i provider e le opzioni compatibili con il flusso COURTLY. Non disabilitare la sicurezza per far funzionare il client.
4. Applica le migrazioni SQL contenute in `supabase/migrations/`, nell'ordine cronologico/numerico dei nomi. Prima di applicarle a un progetto con dati, controlla backup e SQL; non applicarle alla cieca.
5. Verifica le policy RLS e i flussi coach/player in un progetto di test prima di usare dati reali.


## 2. Pubblicare su Vercel
1. Carica il progetto su un repository GitHub privato.
2. In Vercel seleziona **Add New → Project** e importa il repository.
3. Vercel rileva Next.js automaticamente; lascia le impostazioni standard, salvo necessità.
4. In Project → Settings → Environment Variables inserisci:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Avvia il deploy. Per ogni modifica successiva, Vercel pubblica un nuovo deploy dal repository.
6. Apri il link di deployment da telefono e PC e verifica tutte le schermate.

## 3. Verifiche prima di invitare la squadra
- Coach crea una squadra.
- Un giocatore entra nella stessa squadra da un browser/dispositivo separato.
- Entrambi vedono lo stesso roster.
- Coach crea un allenamento e giocatore invia la risposta; coach la vede.
- Coach crea una partita e verifica che sia visibile al giocatore.
- Coach pubblica una convocazione e il giocatore conferma la lettura.
- Verifica calendario, statistiche e notifiche.

## Limiti e sicurezza
- La chiave Supabase `anon`/publishable può essere usata nel client solo con RLS configurata correttamente; non inserire mai `service_role` o segreti server in variabili `NEXT_PUBLIC_`.
- Il codice coach `0000` è un codice temporaneo e non va considerato sicuro per una pubblicazione aperta. Prima del lancio pubblico deve essere sostituito con una procedura di accesso coach più sicura.
- Le migrazioni SQL e i flussi online non sono verificati su un progetto Supabase reale finché non vengono applicati e testati.
- La build di produzione e il test multi-dispositivo sono passaggi obbligatori prima di dichiarare COURTLY pronta.
