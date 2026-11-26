import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

type PushPayload = { title?: string; body?: string; url?: string };
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@courtly.app';
    if (!url || !anon || !serviceKey || !publicKey || !privateKey) return NextResponse.json({ error: 'Push server not configured' }, { status: 503 });
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile, error: profileError } = await userClient.from('profiles').select('role,team_id').eq('id', userData.user.id).single();
    if (profileError || profile?.role !== 'coach' || !profile.team_id) return NextResponse.json({ error: 'Coach access required' }, { status: 403 });
    const body = await req.json() as PushPayload & { recipientIds?: string[] };
    if (!body.title?.trim() || !body.body?.trim() || !Array.isArray(body.recipientIds) || body.recipientIds.length === 0) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const admin = createClient(url, serviceKey);
    const { data: subscriptions, error } = await admin.from('push_subscriptions').select('user_id,endpoint,p256dh_key,auth_key').eq('team_id', profile.team_id).in('user_id', body.recipientIds);
    if (error) return NextResponse.json({ error: 'Could not load push targets' }, { status: 500 });
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({ title: body.title, body: body.body, url: body.url || '/notifications' });
    const results = await Promise.all((subscriptions || []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } }, payload);
        return { ok: true };
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        return { ok: false };
      }
    }));
    return NextResponse.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
  } catch {
    return NextResponse.json({ error: 'Push sending failed' }, { status: 500 });
  }
}
