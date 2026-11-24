import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function sign(payload: string) {
  const secret = process.env.ACCESS_SESSION_SECRET;
  if (!secret) throw new Error('Access server secret is not configured');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function POST(req: Request) {
  if (!process.env.COURTLY_ACCESS_CODE || !process.env.ACCESS_SESSION_SECRET) {
    return NextResponse.json({ error: 'Access protection is not configured.' }, { status: 503 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }
  if (!current || current.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else current.count++;
  let body: { code?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (!safeEqual(String(body.code ?? ''), process.env.COURTLY_ACCESS_CODE)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
  }
  attempts.delete(ip);
  const expires = now + 7 * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  const token = payload + '.' + sign(payload);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('courtly_access', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: new Date(expires });
  return res;
}
