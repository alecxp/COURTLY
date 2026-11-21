# COURTLY — QA online roster fallback fix

## Intervento
La pagina Squadra non carica più il roster demo locale quando Supabase è configurato.
- Se manca `courtly_shared_team_id`, mostra uno stato seed/avviso che invita a rientrare e collegare la squadra.
- Se il recupero del team o roster dal database fallisce, mostra uno stato seed e un messaggio di errore invece di mantenere dati locali potenzialmente fuorvianti.
- In modalità offline/demo, il comportamento locale resta invariato.
- QA statico aggiornato per controllare la guardia di fallback online.

## Test eseguiti
- `node scripts/qa-static.mjs`: 9 pass, 0 fail
- `node scripts/qa-syntax.mjs`: 2 pass, 0 fail

## Limiti
Non eseguiti build Next.js, browser E2E, test con database Supabase reale: dipendenze npm non installate per precedente errore DNS/registry.
