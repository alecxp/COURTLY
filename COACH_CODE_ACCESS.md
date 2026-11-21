# COURTLY Coach access (temporary MVP)

- Player access: nickname + freely entered team name; no code.
- Coach access: nickname + team name + code `0000`.
- If Supabase is configured, the client calls `enter_coach_mode` RPC to validate the code and set the profile role server-side.
- In local demo mode, the code is checked in the app and the role is stored in localStorage.

**Security note:** `0000` is intentionally temporary and weak. Replace it before public launch; anyone who knows the code can request coach mode.

Apply the new migration `supabase/migrations/20261123_coach_code_access.sql` after the existing migrations.
