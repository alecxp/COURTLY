# COURTLY - Shared team data fix


## Implemented in this intervention
- New Supabase migration `20261126_shared_team_join.sql` creates `enter_team_by_name` RPC for authenticated users.
- Coach entry creates the team (or reconnects only to a team created by the same user / where they already have coach membership).
- Player entry joins an existing team by normalized team name; ambiguous names are rejected.
- The entry flow stores the shared team UUID in `courtly_shared_team_id`.
- Teams page fetches team metadata and roster from `teams` + `team_members` + `profiles` when Supabase is configured.
- Online coach roster removal uses a Supabase delete; local demo roster remains local only when Supabase is not configured.
- QA scripts added/updated: static QA and syntax-only checks.

## Checks actually run
- Static QA: 8 checks passed, 0 failures.
- Syntax transpilation check: 2 TSX files passed, 0 syntax errors.
- TypeScript full project check remains blocked because dependencies are absent; errors are missing React/Next/Supabase modules/types.
- Migration has not been executed against a live Supabase database. Apply it after the existing migrations, then verify with two separate authenticated users/devices.

## Important remaining limitation
This change establishes shared team membership and shared roster reads. Trainings, games, calendar, convocations, notifications, and statistics are not all migrated from localStorage to Supabase yet; they remain separate/local until wired to the shared database. This archive should not be presented as fully multi-device complete.

## Product flow
Coach enters with the temporary coach code and team name; online flow creates the shared team record. Players enter as player with that exact team name after the coach has created it. No team approval workflow is added.
