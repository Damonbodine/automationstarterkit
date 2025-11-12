import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EmailAI',
    short_name: 'EmailAI',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1221',
    theme_color: '#1e40af',
    description: 'AI-powered email classification and summarization',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

