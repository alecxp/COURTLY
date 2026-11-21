const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error('COURTLY: configurazione online incompleta. Variabili mancanti:');
  for (const key of missing) console.error(` - ${key}`);
  console.error('Configura queste variabili in .env.local (locale) o nel provider di hosting (produzione).');
  process.exitCode = 1;
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!/^https:\/\/[\w.-]+/.test(url)) {
    console.error('NEXT_PUBLIC_SUPABASE_URL non sembra un URL HTTPS valido.');
    process.exitCode = 1;
  } else {
    console.log('COURTLY: variabili Supabase presenti. Ricorda di verificare RLS e migrazioni.');
  }
}
