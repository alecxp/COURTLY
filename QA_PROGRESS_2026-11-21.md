# COURTLY QA progress — 21 Nov 2026

## Actual fix made
- `app/coach/page.tsx` referenced `dateValue()` in the coach dashboard date formatter but had no definition. Added a local-date parser for `YYYY-MM-DD`, including invalid-date validation. This avoids UTC timezone shifts and prevents a missing identifier from breaking the route.
- `scripts/qa-static.mjs` now checks that the coach date helper is both defined and referenced.

## Re-run
- `npm run qa:static`: PASS (5 checks, 0 failures)
- Routes: 12 discovered
- Relative imports: resolve
- Static internal hrefs: match discovered routes
- `package.json`: valid JSON

## Blocked verification
Full Next.js build, React typecheck, interactive browser tests, and Supabase integration remain blocked because dependencies could not be installed due registry DNS/network failure (`EAI_AGAIN`).
