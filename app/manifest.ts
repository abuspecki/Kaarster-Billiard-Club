import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Billiard-Tracker',
    short_name: 'Billiard',
    description: 'Sitzungen, Turniere und Ranglisten für eure Billiard-Runde',
    start_url: '/',
    display: 'standalone',
    background_color: '#121214',
    theme_color: '#121214',
    lang: 'de',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
