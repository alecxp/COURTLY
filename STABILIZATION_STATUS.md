# COURTLY stabilization status

## Verified in this environment
- Project archive extracted successfully.
- Project route files are present: home, dashboard, coach, teams, trainings, games, calendar, notifications, statistics, profile, Pro Basket, and auth redirect.
- `package.json` scripts are present for `dev`, `build`, `lint`, `typecheck`, and `check`.

## Not verified
- Dependencies could not be installed: `npm install` timed out in this environment.
- TypeScript cannot be meaningfully validated without installed React/Next/Supabase typings. The global `tsc` invocation reports missing modules and JSX typings, so these are environment/dependency errors and not a clean pass.
- No production build, browser test, cross-user synchronization test, or Supabase integration test has been completed.

## Next verification sequence
1. Run `npm install` on a machine with internet access.
2. Run `npm run typecheck` and fix all project errors.
3. Run `npm run lint` and fix all warnings/errors.
4. Run `npm run build`.
5. Run `npm run dev` and test all screens on desktop and mobile.
6. Configure Supabase and test shared data using two separate accounts/devices.
