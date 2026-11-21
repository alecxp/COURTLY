# COURTLY — QA integration update

Date: 2026-11-21

## Implemented in this update

- Shared convocation persistence in the `games` page: coach drafts/publications write a convocation header and selected players to Supabase; players can confirm their own selected convocation.
- Added migration `20261128_shared_convocations.sql` to add convocation notes and team-scoped RLS policies, plus a guard restricting player updates to their own confirmation.
- Calendar team events now load from Supabase events when shared-team context is available; Pro Basket fixtures remain demo data.
- Statistics load team trainings and event responses from Supabase when shared context is available; otherwise local demo data is labeled local.
- Coach summary loads shared team events and response counts when shared context is available.
- Added shared team notifications (per-recipient table), best-effort sender helper, and notification read/delete operations when shared context is available.
- Added migration `20261129_shared_notifications.sql` for recipient-scoped notifications, RLS, and a trigger restricting recipients to read-state updates.
- Updated README migration/status instructions and QA scripts.

## Automated checks performed

- TypeScript/JSX transpile syntax: **18 source files passed, 0 syntax errors**.
- Static QA: **15 checks passed, 0 failures**.
- ZIP archive integrity: verified separately after packaging.

## Not completed / not verified

- Full Next.js build and semantic TypeScript typecheck: blocked because project dependencies are not installed; earlier npm install failed due registry DNS/network error.
- SQL migrations were reviewed and static-checked, not executed against a live Supabase database.
- Browser end-to-end tests, two-device synchronization tests, RLS tests with coach/player accounts, and live notification tests were not run.
- Notifications are in-app database records, not push notifications. Realtime subscriptions are not implemented.
- Pro Basket fixtures remain demo data.
- Coach code `0000` is a temporary development credential and must be replaced before public release.

## Migration order

After the prior shared-events migration, apply:
1. `supabase/migrations/20261128_shared_convocations.sql`
2. `supabase/migrations/20261129_shared_notifications.sql`

Test with separate authenticated coach and player sessions after applying migrations.
