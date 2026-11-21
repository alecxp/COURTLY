# COURTLY stabilization update — coach code entry

## Implemented in this package
- Coach role selector now reveals a code field.
- Temporary coach code is `0000`; incorrect codes block entry.
- Player entry remains nickname + freely entered team name, without code.
- Supabase-configured mode calls the `enter_coach_mode` RPC before entering coach mode.
- Added migration `20261123_coach_code_access.sql` to validate the temporary code server-side and set the authenticated profile role to coach.
- Local/demo mode validates the code in the client and saves the role locally.


## Validation
- TypeScript transpile syntax check passed for app/lib source files.
- `package.json` JSON parse passed.
- Full Next build, lint, and runtime tests have not been run: dependencies are not installed in this package/environment.
- SQL migration has not been applied to a live Supabase database.

## Security caveat
The temporary code `0000` is weak by design and must be changed before public launch. Anyone who knows it can request coach mode. The server RPC prevents relying only on a local role flag, but it does not make a shared code strong authentication.
