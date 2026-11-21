'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <nav className="mobile-nav" aria-label="Navigazione mobile">
    <Link href="/dashboard" aria-label="Home"><span>⌂</span><small>Home</small></Link>
    <Link href="/trainings" aria-label="Allenamenti"><span>▣</span><small>Allenamenti</small></Link>
    <Link href="/games" aria-label="Partite"><span>🏀</span><small>Partite</small></Link>
    <Link href="/calendar" aria-label="Calendario"><span>▦</span><small>Calendario</small></Link>
    <Link href="/statistics" aria-label="Statistiche"><span>▥</span><small>Stats</small></Link>
    <Link href="/pro-basket" aria-label="Pro Basket"><span>🏀</span><small>Pro Basket</small></Link>
    <Link href="/notifications" aria-label="Notifiche"><span>♧</span><small>Notifiche</small></Link>
  </nav>;
}
