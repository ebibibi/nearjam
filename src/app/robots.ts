import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/auth/',
          '/*/profile/setup',
          '/*/sessions/*/live',
          '/*/sessions/*/edit',
          '/*/sessions/*/qr',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
