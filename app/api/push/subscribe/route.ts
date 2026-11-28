import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseForToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
}
async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\\s+/i, '');
  if (!token) return null;
  const client = getSupabaseForToken(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { client, user: data.user };
}
export async function POST(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const subscription = body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Push storage is not configured on server' }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin.from('profiles').select('team_id').eq('id', auth.user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: 'Could not load team profile' }, { status: 500 });
    const { data: existing, error: existingError } = await admin.from('push_subscriptions').select('user_id').eq('endpoint', subscription.endpoint).maybeSingle();
    if (existingError) return NextResponse.json({ error: 'Could not check existing subscription' }, { status: 500 });
    if (existing && existing.user_id !== auth.user.id) return NextResponse.json({ error: 'This device subscription is already linked to another account. Unsubscribe and retry.' }, { status: 409 });
    const row = {
      user_id: auth.user.id,
      team_id: profile?.team_id || null,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (error) return NextResponse.json({ error: 'Subscription save failed', detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Push subscription service unavailable' }, { status: 503 });
  }
}
export async function DELETE(req: Request) {
  try {
    const auth = await getUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const endpoint = body?.endpoint;
    if (typeof endpoint !== 'string' || !endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Push storage is not configured on server' }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await admin.from('push_subscriptions').delete().eq('user_id', auth.user.id).eq('endpoint', endpoint);
    if (error) return NextResponse.json({ error: 'Subscription removal failed', detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Push subscription service unavailable' }, { status: 503 });
  }
}
