# COURTLY QA - Coach access guard

## Change
- Coach access is no longer granted by the selected UI role alone.
- In local/demo mode, selecting Coach is rejected with a clear message.
- When Supabase is configured, the route to `/coach` is allowed only if the stored profile role is `coach`.
- The effective role defaults to `player` and is read from the profile.

## Validation
- Reviewed the edited `app/page.tsx` control flow and confirmed the coach guard is before local role persistence and routing.
- Full Next.js build, lint, and TypeScript validation were not run because project dependencies are not installed and previous npm registry access was unavailable.

## Remaining security work
- Anonymous sign-in and coach provisioning still need a production-grade authorization workflow.
- LocalStorage profile/team fields remain demo-only and must not be treated as identity or shared membership.
