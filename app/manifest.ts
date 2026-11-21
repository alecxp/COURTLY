import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'COURTLY — Basketball Team',
    short_name: 'COURTLY',
    description: 'La gestione intelligente della tua squadra di basket.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090e18',
    theme_color: '#101a29',
    icons: [{ src: '/courtly-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
  };
}
