import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function verify(token: string, secret: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, createHmac('sha256', secret).update(payload).digest('hex'))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.expires >= Date.now() ? data : null;
  } catch { return null; }
}
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.ACCESS_SESSION_SECRET;
  if (!url || !anon || !service || !secret) return NextResponse.json({ error: 'Server configuration incomplete.' }, { status: 503 });
  const cookie = req.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('courtly_access='));
  const access = cookie ? verify(decodeURIComponent(cookie.slice('courtly_access='.length)), secret) : null;
  if (!access) return NextResponse.json({ error: 'Access expired.' }, { status: 401 });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const TEAM_ID = 'bd012338-db12-4192-a360-573472a80ad3';
  const { data: team, error: teamError } = await admin.from('teams').select('id,name,category,season').eq('id', TEAM_ID).maybeSingle();
  if (teamError || !team) return NextResponse.json({ error: teamError?.message || 'Team not found.' }, { status: 404 });
  const { data: memberships, error: rosterError } = await admin.from('team_members').select('id,user_id,role,is_first_year').eq('team_id', team.id);
  if (rosterError) return NextResponse.json({ error: rosterError.message }, { status: 500 });
  const ids = [...new Set((memberships || []).map(m => m.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = ids.length ? await admin.from('profiles').select('id,nickname,role,team_id,playing_position').in('id', ids) : { data: [], error: null };
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });
  const map = new Map((profiles || []).map(p => [p.id, p]));
  // Display each nickname only once (case-insensitive); preserve the earliest membership as canonical.
  const uniqueMembers = new Map<string, any>();
  for (const m of memberships || []) {
    const nickname = (map.get(m.user_id)?.nickname || 'Membro').trim() || 'Membro';
    const key = nickname.toLocaleLowerCase();
    if (!uniqueMembers.has(key)) uniqueMembers.set(key, { id: m.id, nickname, role: m.role, is_first_year: !!m.is_first_year });
  }
  return NextResponse.json({ team, members: [...uniqueMembers.values()] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
