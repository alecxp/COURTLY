# COURTLY MVP

Responsive basketball team-management web app scaffold built with Next.js, TypeScript and Supabase.


## Setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and anon key.
4. In Supabase SQL Editor, run `supabase/schema.sql`.
5. Then run `supabase/migrations/001_security_and_team_policies.sql`.
6. Then run `supabase/migrations/002_auth_roles_nickname.sql`.
7. Then run `supabase/migrations/20261120_team_members.sql` to add the membership foundation.
8. Run `npm run dev`.


## Current scaffold
- Player home and coach dashboard
- Initial auth/profile pages
- Training module prototype
- Supabase schema and initial security migration


## Important
This remains a development scaffold. The Supabase project is not connected, live multi-user synchronization has not been verified, and policies should be reviewed/tested with separate player/coach/admin accounts before production.

## Pro Basket (demo module)
Added `/pro-basket`, a player-facing hub for Italian Serie A men's and women's basketball. It includes league filters, sample fixture cards, favorite/follow toggles, and responsive styling. Fixtures are **demo data** and must be replaced by a verified official schedule feed/API before release.

## Calendario unificato (demo)
- Nuova route `/calendar` con agenda raggruppata per data.
- Filtri per allenamenti, partite della squadra, Serie A maschile e Serie A1 femminile.
- Preferiti/salvati con persistenza locale nel browser.
- Navigazione collegata dalla dashboard e da Pro Basket.
- Fixtures calendario ancora dimostrative: da sostituire con dati ufficiali e backend condiviso.

## Latest update — Notifications & Web App direction

- Removed the Social / Watch Together / user-organized away-trip feature.
- Added the `/notifications` notification center with All / Unread filters, mark-read actions, mark-all-read, and local preference toggles.
- Notification read states and preference switches persist in localStorage for this prototype.
- Added a responsive bottom navigation for mobile web.
- Notifications are demo content: push delivery, cross-device sync, and server-generated events require Supabase/backend integration.
- This project remains a responsive web app (Next.js), with mobile web navigation. PWA installation/offline support is not yet configured.
- Added web-app manifest and Courtly SVG icon as groundwork for installable mobile web/PWA behavior. Service worker/offline caching is not yet implemented.

## Accesso semplificato (nickname-only)

COURTLY usa un ingresso con nickname e scelta del ruolo; non richiede email o password. Se Supabase è configurato, l'ingresso crea una sessione anonima Supabase e salva il profilo. In modalità demo, nickname e ruolo vengono salvati localmente. Le sessioni anonime non sono recuperabili su un altro dispositivo e il nickname da solo non dimostra l'identità dell'utente; la gestione coach dovrà essere protetta con invito/codice coach prima del rilascio.


## Dashboard giocatore (demo locale)
La dashboard ora legge nickname e nome squadra dal flusso di ingresso e mostra lo spogliatoio personale e consente di rispondere ai due appuntamenti demo (presente/assente oppure disponibile/non disponibile). Le risposte sono salvate nel localStorage del dispositivo: questa parte non è ancora sincronizzata tra utenti o dispositivi.

### Allenamenti — miglioramenti demo
- Il coach può impostare una scadenza per le conferme.
- Dopo la scadenza, la risposta del giocatore viene bloccata.
- Il giocatore risponde usando il nickname salvato nel dispositivo.
- Le risposte e gli allenamenti continuano a essere salvati localmente nel prototipo.

## Partite & disponibilità (prototipo)

La nuova sezione `/games` permette al coach di creare una partita con avversario, competizione, data, ora gara e ritrovo, luogo, casa/trasferta, note e scadenza disponibilità. I giocatori possono indicare disponibilità o indisponibilità; la vista riepiloga risposte e mancanti. Gli eventi creati vengono salvati localmente e mostrati anche nel calendario del dispositivo. Non è ancora sincronizzato tra utenti: serve l'integrazione backend condivisa.

## Notifiche locali (prototipo)
- Le creazioni di allenamenti e partite generano notifiche nel centro notifiche sul dispositivo.
- Il centro notifiche ascolta nuovi eventi nella stessa scheda e aggiornamenti da altre schede del browser.
- È possibile segnare tutte come lette o svuotare l'elenco.
- Le notifiche non sono push e non vengono sincronizzate tra dispositivi: backend e push restano da collegare.

## Calendario aggiornato
- Vista Agenda/Mese con navigazione mensile.
- Indicatori nel calendario per allenamenti, partite squadra e Pro Basket demo.
- Filtri per categoria e lista eventi del mese.
- Gli eventi di squadra presenti nel salvataggio locale vengono integrati nell'agenda.
- Gli eventi Pro Basket in questa versione sono dimostrativi: calendario ufficiale e sincronizzazione server restano da collegare.

## Team / roster demo (nickname + nome squadra)

La schermata Squadra non richiede codici. Il giocatore può indicare nickname e nome squadra. In questa versione, l'aggiunta al roster è una simulazione locale nello stesso browser: non crea una squadra condivisa online.

## Profilo locale

Il profilo permette di aggiornare nickname e nome squadra sul dispositivo. Il ruolo è mostrato ma non modificabile da questa schermata.


## Shared team data — integration update (2026-11-21)

The team flow, roster, team trainings/games, convocations, calendar team events, statistics (training response data), coach summary, and team notifications now have Supabase integration paths. Local demo fallback remains when no shared-team context exists; online failures are surfaced instead of silently presented as shared data.

Apply these migrations after the existing shared-events migration, in order:
- `supabase/migrations/20261128_shared_convocations.sql`
- `supabase/migrations/20261129_shared_notifications.sql`

This integration is not runtime-verified yet: dependencies could not be installed in the environment, and no Supabase project credentials/database were available. Before release, run build/typecheck, apply migrations in Supabase, and test coach/player accounts on separate devices. Push notifications, realtime subscriptions, Pro Basket official data, and full multi-device verification remain outstanding.


## Shared code access — server secrets required

The access endpoint accepts only the explicit roles `player` and `coach`. Configure these server-side environment variables (never in NEXT_PUBLIC variables):
- `COURTLY_ACCESS_CODE=1891`
- `COURTLY_COACH_CODE=1921`
- `ACCESS_SESSION_SECRET` (a long random secret used to sign the access cookie)

If any are missing, the endpoint returns 503 rather than silently using a code embedded in source. The current in-memory attempt counter is a basic safeguard only; it is not a distributed rate limiter and must be replaced with persistent rate limiting before production.
