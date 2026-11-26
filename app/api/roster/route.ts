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
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return NextResponse.json({ error: 'Session missing.' }, { status: 401 });
  const cookie = req.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('courtly_access='));
  const access = cookie ? verify(decodeURIComponent(cookie.slice('courtly_access='.length)), secret) : null;
  if (!access) return NextResponse.json({ error: 'Access expired.' }, { status: 401 });
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from('profiles').select('id,nickname,role,team_id').eq('id', auth.user.id).maybeSingle();
  if (profileError || !profile?.team_id) return NextResponse.json({ error: profileError?.message || 'Profile/team missing.' }, { status: 404 });
  const { data: team, error: teamError } = await admin.from('teams').select('id,name,category,season').eq('id', profile.team_id).maybeSingle();
  if (teamError || !team) return NextResponse.json({ error: teamError?.message || 'Team not found.' }, { status: 404 });
  const { data: memberships, error: rosterError } = await admin.from('team_members').select('id,user_id,role,is_first_year').eq('team_id', team.id);
  if (rosterError) return NextResponse.json({ error: rosterError.message }, { status: 500 });
  const ids = [...new Set((memberships || []).map(m => m.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = ids.length ? await admin.from('profiles').select('id,nickname,role,team_id').in('id', ids) : { data: [], error: null };
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });
  const map = new Map((profiles || []).map(p => [p.id, p]));
  return NextResponse.json({ team, members: (memberships || []).map(m => ({ id:m.id, nickname: map.get(m.user_id)?.nickname || (m.user_id === auth.user.id ? profile.nickname : 'Membro'), role: m.role, is_first_year: !!m.is_first_year })) });
}
