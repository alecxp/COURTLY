# COURTLY — Shared Trainings & Games QA
Date: 2026-11-21


## Implemented in source
- Added `lib/shared-events.ts` helper to resolve authenticated user/team context, query shared events, and convert datetimes to local UI values.
- Added migration `supabase/migrations/20261127_shared_events_sync.sql` to replace broad/duplicate event and response policies with team-member read and coach-write policies, and player-own response insert/update policies.
- Trainings page now loads team training events and member roster from Supabase when a shared team context exists; coach-created trainings are inserted to `events`; player attendance replies are upserted to `event_responses`.
- Games page now loads shared game events and team roster from Supabase; coach-created games are inserted to `events`; player availability replies are upserted to `event_responses`.
- Local browser storage remains a fallback for demo/offline mode. Convocation data is still local and is not included in this synchronization change.
- QA syntax script expanded to cover both changed pages and shared-event helper.

## Checks performed
- `node scripts/qa-syntax.mjs`: 5/5 syntax transpilation checks passed.
- `npm run qa:static`: 9/9 checks passed.
- `tsc --noEmit`: blocked by missing npm dependencies/type packages (React, Next, Supabase); not reported as passed.
- Database migration was reviewed but not applied or runtime-tested against Supabase.
- Browser end-to-end and cross-device sync tests remain blocked until dependencies and a configured Supabase project are available.

## Apply migration
Run `supabase/migrations/20261127_shared_events_sync.sql` in the Supabase SQL editor after the team membership migrations. Then configure `.env.local` with the project URL and anon key, install dependencies, and test with two authenticated accounts/devices.
