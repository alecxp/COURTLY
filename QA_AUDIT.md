# COURTLY QA audit — verified in this session

## Checks performed
- Inspected the project archive and core app routes.
- Confirmed the Next.js / React / TypeScript / Supabase dependency declarations in `package.json`.
- Confirmed there is no `node_modules` folder in this extracted package.
- Ran `tsc --noEmit` using the globally available TypeScript compiler. It fails because dependencies and their type declarations are not installed; the resulting missing-module/JSX-type errors are not a valid project type-check result.
- Inspected the nickname-only entry flow, Supabase client, schema and RLS migrations.


## Confirmed blockers / risks
1. **Build and runtime not verified**: dependencies must be installed successfully before `npm run build`, `npm run lint`, and `npm run typecheck` can be trusted.
2. **Coach role is self-selectable at anonymous onboarding**: the onboarding sends `requested_role: coach`; migration `002_auth_roles_nickname.sql` assigns that metadata to `profiles.role`. The team policies use the coach role for privileged actions. This is not production-safe and must be replaced with a coach approval/provisioning flow before connecting real users.
3. **Team-name entry is not membership**: the team name is stored in browser local storage. Entering the same team name on two devices does not link users to one shared roster.
4. **Most app modules are still demo/local-storage flows**: shared multi-user data behavior is not yet verified.
5. **Supabase RLS needs end-to-end tests** using separate coach and player accounts, including negative tests (player cannot create/edit/delete coach-managed events or convocations; player cannot change role/team; users cannot read unrelated team data).
6. **Anonymous sessions are device-bound**: nickname-only sessions are not a reliable identity or account recovery mechanism.

## Required next work, in order
1. Install dependencies in an environment with npm registry access and capture the real installation result.
2. Run `npm run lint`, `npm run typecheck`, and `npm run build`; fix errors one by one.
3. Secure coach onboarding/authorization before real deployment.
4. Implement explicit team creation/join membership workflow (without assuming same-name teams are linked).
5. Move training/game/availability/convocation data from local storage to Supabase and test cross-device synchronization.
6. Test mobile and desktop routes, forms, empty states, loading states, and error states.


## Status
This audit is based on source inspection and a TypeScript command attempted without installed dependencies. It does **not** certify that the app builds or that runtime flows work. No production-readiness claim is made.

## Security hardening update (2026-11-21)

- Added `20261121_membership_security_hardening.sql` after the team-members migration.
- Removed client-side update policy for team membership rows to prevent role escalation.
- Restricted coach deletion of memberships to player memberships.
- Scoped player convocation confirmations to a team membership and added a trigger preventing players from changing row identity (`player_id` / `convocation_id`).
- This migration has **not been applied to a live Supabase project** and has not been tested against a running database; review and apply only after backup and staging validation.
