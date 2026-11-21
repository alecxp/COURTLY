#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

printf '\n== COURTLY setup ==\n'
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed. Install Node.js 22 LTS and retry." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed." >&2
  exit 1
fi
node --version
npm --version

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example. Add your Supabase URL and anon key if you want online mode."
fi

printf '\n== Installing npm dependencies ==\n'
npm install

printf '\n== Static and syntax QA ==\n'
npm run qa:static
npm run qa:syntax

if [[ -f .env.local ]] && grep -Eq '^NEXT_PUBLIC_SUPABASE_URL=.+$' .env.local && grep -Eq '^NEXT_PUBLIC_SUPABASE_ANON_KEY=.+$' .env.local; then
  echo "Supabase environment entries appear configured. Verify values manually before use."
else
  echo "Supabase credentials are not configured; the app may use demo/local mode."
fi

printf '\n== Production build ==\n'
npm run build
printf '\nSetup complete. Start the app with: npm run dev\n'
