import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!url || !anon || !serviceKey || !publicKey || !privateKey) return NextResponse.json({ error: 'Push server not configured' }, { status: 503 });
    const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = createClient(url, serviceKey);
    const { data: subs, error: subError } = await admin.from('push_subscriptions').select('endpoint,p256dh_key,auth_key').eq('user_id', data.user.id);
    if (subError) return NextResponse.json({ error: 'Could not load subscription' }, { status: 500 });
    if (!subs?.length) return NextResponse.json({ error: 'No device subscription found' }, { status: 404 });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@courtly.app', publicKey, privateKey);
    let sent = 0;
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } }, JSON.stringify({ title: 'COURTLY · Test', body: 'Notifica push ricevuta: dispositivo registrato correttamente! 🏀', url: '/notifications' })); sent++; }
      catch (err: any) { if (err?.statusCode === 404 || err?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint); }
    }
    return NextResponse.json({ sent, failed: subs.length - sent });
  } catch { return NextResponse.json({ error: 'Push test failed' }, { status: 500 }); }
}
