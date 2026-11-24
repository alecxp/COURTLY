import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

function valid(token: string) {
  const secret = process.env.ACCESS_SESSION_SECRET;
  if (!secret) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expiry = Number(payload);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/' || path.startsWith('/api/access') || path.startsWith('/_next') || path === '/favicon.ico' || path === '/sw.js') return NextResponse.next();
  const token = req.cookies.get('courtly_access')?.value;
  if (token && valid(token)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
