import './globals.css';
import type { ReactNode } from 'react';
import MobileNav from './mobile-nav';

export const metadata = {
  title: 'Courtly — Basketball Team',
  description: 'La gestione intelligente della tua squadra di basket.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/courtly-icon.svg' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="it"><body>{children}<MobileNav /></body></html>;
}
