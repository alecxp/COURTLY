import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const app = path.join(root, 'app');
const failures = [];
const passed = [];
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const files = walk(app).filter(f => /\.(tsx?|jsx?)$/.test(f));
const routes = new Set(['/']);
for (const f of files) if (path.basename(f) === 'page.tsx' || path.basename(f) === 'page.ts') routes.add('/' + path.relative(app,path.dirname(f)).split(path.sep).filter(Boolean).join('/'));
passed.push(`Routes discovered: ${routes.size}`);
let missingImports = 0;
for (const f of files) {
  const source = fs.readFileSync(f,'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    const base = path.resolve(path.dirname(f), match[1]);
    const candidates = [base, base+'.ts', base+'.tsx', base+'.js', base+'.jsx', path.join(base,'index.ts'), path.join(base,'index.tsx')];
    if (!candidates.some(p => fs.existsSync(p))) { failures.push(`Missing relative import in ${path.relative(root,f)}: ${match[1]}`); missingImports++; }
  }
}
if (!missingImports) passed.push('Relative imports resolve');
let badLinks = 0;
for (const f of files) {
 const source = fs.readFileSync(f,'utf8');
 for (const m of source.matchAll(/href\s*=\s*['"](\/[^'"]*)['"]/g)) {
  const href = m[1].split(/[?#]/)[0];
  if (!routes.has(href) && href !== '/favicon.ico' && href !== '/manifest.json') { failures.push(`Static href has no route: ${href} (${path.relative(root,f)})`); badLinks++; }
 }
}
if (!badLinks) passed.push('Static internal hrefs match discovered routes');
const coachSource = fs.readFileSync(path.join(app, 'coach', 'page.tsx'), 'utf8');
if (/\bdateValue\s*=/.test(coachSource) && /\bdateValue\s*\(/.test(coachSource)) passed.push('Coach date formatter helper is defined and referenced');
else failures.push('Coach date formatter helper missing or unreferenced');
try { JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')); passed.push('package.json parses'); } catch(e) { failures.push('package.json invalid JSON'); }
const sharedMigration = path.join(root, 'supabase', 'migrations', '20261126_shared_team_join.sql');
const entrySource = fs.readFileSync(path.join(app, 'page.tsx'), 'utf8');
const teamSource = fs.readFileSync(path.join(app, 'teams', 'page.tsx'), 'utf8');
if (fs.existsSync(sharedMigration) && /enter_team_by_name/.test(fs.readFileSync(sharedMigration,'utf8'))) passed.push('Shared team join/create RPC migration exists');
else failures.push('Shared team join/create RPC migration missing');
if (/rpc\('enter_team_by_name'/.test(entrySource) && /courtly_shared_team_id/.test(entrySource)) passed.push('Entry flow stores shared team membership ID');
else failures.push('Entry flow does not connect to shared-team RPC');
if (/from\('team_members'\)/.test(teamSource) && /courtly_shared_team_id/.test(teamSource)) passed.push('Team roster reads shared membership records');
else failures.push('Team roster is not connected to shared memberships');
if (/In online mode never fall back to browser-local demo roster/.test(teamSource) && /if \(!teamId\)/.test(teamSource)) passed.push('Online roster refuses local-demo fallback when shared team ID is missing');
else failures.push('Online roster may show stale local demo data without a shared team ID');
const sharedConvocationMigration = path.join(root, 'supabase', 'migrations', '20261128_shared_convocations.sql');
const gamesSource = fs.readFileSync(path.join(app, 'games', 'page.tsx'), 'utf8');
if (fs.existsSync(sharedConvocationMigration) && /add column if not exists notes/.test(fs.readFileSync(sharedConvocationMigration,'utf8'))) passed.push('Shared convocation migration adds persistent notes and policies');
else failures.push('Shared convocation migration missing or incomplete');
if (/from\('convocations'\)/.test(gamesSource) && /from\('convocation_players'\)/.test(gamesSource) && /persistConvocation/.test(gamesSource)) passed.push('Games page loads and saves online convocation selections');
else failures.push('Online convocation persistence is not wired into games page');
const calendarSource = fs.readFileSync(path.join(app, 'calendar', 'page.tsx'), 'utf8');
if (/loadSharedEvents/.test(calendarSource) && /Calendario squadra sincronizzato/.test(calendarSource)) passed.push('Calendar reads shared team events');
else failures.push('Calendar is not wired to shared team events');
const statisticsSource = fs.readFileSync(path.join(app, 'statistics', 'page.tsx'), 'utf8');
if (/loadSharedEvents/.test(statisticsSource) && /Dati condivisi/.test(statisticsSource)) passed.push('Statistics reads shared training events and replies');
else failures.push('Statistics are not wired to shared training data');
const coachSourceOnline = fs.readFileSync(path.join(app, 'coach', 'page.tsx'), 'utf8');
if (/loadSharedEvents/.test(coachSourceOnline) && /Dati condivisi/.test(coachSourceOnline)) passed.push('Coach dashboard reads shared events and team responses');
else failures.push('Coach dashboard is not wired to shared team data');
const notificationMigration = path.join(root, 'supabase', 'migrations', '20261129_shared_notifications.sql');
const notificationHelper = fs.readFileSync(path.join(root, 'lib', 'courtly-notifications.ts'), 'utf8');
const notificationPage = fs.readFileSync(path.join(app, 'notifications', 'page.tsx'), 'utf8');
if (fs.existsSync(notificationMigration) && /team_notifications/.test(fs.readFileSync(notificationMigration,'utf8')) && /addSharedTeamNotification/.test(notificationHelper) && /team_notifications/.test(notificationPage)) passed.push('Shared team notifications schema, sender and reader are wired');
else failures.push('Shared notifications backend integration is incomplete');

console.log('COURTLY STATIC QA');
for (const p of passed) console.log('PASS',p);
for (const f of failures) console.log('FAIL',f);
console.log(`RESULT: ${passed.length} passed checks, ${failures.length} failures`);
process.exitCode = failures.length ? 1 : 0;
