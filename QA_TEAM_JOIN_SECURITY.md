# COURTLY QA — Team Join Security Foundation

## Verified from current project source
- 12 App Router page files are present.
- `/auth` redirects to the app entry; the main entry is nickname-based.
- Existing coach role was read from Supabase profile, but the prior onboarding migration accepted client `requested_role` metadata.
- `/teams` is still a browser-local demo using localStorage. It is not yet integrated with Supabase team/membership data.
- `node_modules` is absent; full lint, TypeScript and Next build are not executable in this environment.

## New migration
`supabase/migrations/20261122_secure_team_join_requests.sql`
- New user profile creation always sets `role='player'` and `team_id=NULL`, ignoring client metadata.
- Profile insert policy permits only self-created player profiles with no team assignment.
- Legacy coach profiles and coach membership rows are demoted because the old onboarding allowed self-selected coach roles. Verified coaches must be re-provisioned by a trusted administrator.
- Adds team join request table and scoped read policy.
- Direct client writes to join requests are revoked; RPCs are the controlled request/approval/rejection path.
- Request by exact team name; no-match and duplicate-name cases are rejected.
- Coach-only approval/rejection; approval adds a player membership and syncs the legacy profile team_id.
- Team creation policy is reasserted as verified-coach-only.

## Static checks
A source-level assertion script passed 12 checks for migration structure and role restrictions. This is not a live SQL execution.


## Not yet done
- Migration has not been applied to a live Supabase project.
- RPC/RLS behavior has not been tested with separate accounts.
- Team screen is still demo/local; UI integration with team request RPCs and roster queries is the next coding step.
- Full build/lint/typecheck are blocked until dependencies are installed.

## Safe rollout
1. Back up the Supabase database.
2. Confirm existing migrations are applied in order.
3. Apply the new migration.
4. Re-provision verified coach accounts via trusted admin only.
5. Integrate the team UI with team creation, request, approval and roster queries.
6. Test authorization and multi-account flows before production.
