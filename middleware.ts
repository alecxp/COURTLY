import { NextRequest, NextResponse } from 'next/server';

async function valid(token: string) {
  const secret = process.env.ACCESS_SESSION_SECRET;
  if (!secret) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expected = Array.from(new Uint8Array(signed), (b) => b.toString(16).padStart(2, '0')).join('');
    if (signature.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < signature.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return false;
    const expiry = Number(payload);
    return Number.isFinite(expiry) && expiry > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/' || path.startsWith('/api/access') || path === '/api/team-entry' || path.startsWith('/_next') || path === '/favicon.ico' || path === '/sw.js') return NextResponse.next();
  const token = req.cookies.get('courtly_access')?.value;
  if (token && await valid(token)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
